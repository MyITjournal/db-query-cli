import { randomBytes, createHash } from "node:crypto";
import { createServer } from "node:http";
import { URL } from "node:url";
import open from "open";
import {
  BASE_URL,
  saveCredentials,
  loadCredentials,
  clearCredentials,
} from "./config.js";

function generateCodeVerifier() {
  return randomBytes(48).toString("base64url");
}

function generateCodeChallenge(verifier) {
  return createHash("sha256").update(verifier).digest("base64url");
}

function generateState() {
  return randomBytes(16).toString("hex");
}

function decodeJwtPayload(token) {
  try {
    const payload = token.split(".")[1];
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

function isTokenExpiringSoon(token, bufferSeconds = 30) {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return true;
  return Date.now() / 1000 > payload.exp - bufferSeconds;
}

function waitForCallback(port, expectedState) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => {
        server.close();
        reject(new Error("Login timed out after 5 minutes."));
      },
      5 * 60 * 1000,
    );

    const server = createServer((req, res) => {
      const url = new URL(req.url, `http://localhost:${port}`);
      if (url.pathname !== "/callback") {
        res.end();
        return;
      }

      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      const error = url.searchParams.get("error");

      if (error) {
        res.writeHead(400);
        res.end(
          `<h2>Login failed: ${error}</h2><p>You can close this tab.</p>`,
        );
        clearTimeout(timeout);
        server.close();
        reject(new Error(`GitHub OAuth error: ${error}`));
        return;
      }

      if (state !== expectedState) {
        res.writeHead(400);
        res.end("<h2>Invalid state parameter. Request rejected.</h2>");
        clearTimeout(timeout);
        server.close();
        reject(new Error("State mismatch — possible CSRF attempt."));
        return;
      }

      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(
        "<h2>Login successful!</h2><p>You can close this tab and return to your terminal.</p>",
      );
      clearTimeout(timeout);
      server.close();
      resolve(code);
    });

    server.listen(port);
  });
}

export async function login() {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  const state = generateState();
  const port = 9876;
  const redirectUri = `http://localhost:${port}/callback`;

  const authUrl = new URL(`${BASE_URL}/auth/github`);
  authUrl.searchParams.set("code_challenge", codeChallenge);
  authUrl.searchParams.set("code_challenge_method", "S256");
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("state", state);

  console.log("\nOpening browser for GitHub login...");
  console.log(
    `If the browser does not open automatically, visit:\n  ${authUrl.toString()}\n`,
  );

  await open(authUrl.toString());

  const code = await waitForCallback(port, state);

  const res = await fetch(`${BASE_URL}/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, code_verifier: codeVerifier }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? "Token exchange failed");

  await saveCredentials({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    username: data.username,
  });

  return data.username;
}

export async function getValidTokens() {
  const creds = await loadCredentials();
  if (!creds) return null;

  if (!isTokenExpiringSoon(creds.access_token)) {
    return creds;
  }

  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: creds.refresh_token }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message ?? "Refresh failed");

    const updated = {
      ...creds,
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    };
    await saveCredentials(updated);
    return updated;
  } catch {
    await clearCredentials();
    return null;
  }
}

export async function logout() {
  const creds = await loadCredentials();
  if (!creds) return false;

  try {
    await fetch(`${BASE_URL}/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: creds.refresh_token }),
    });
  } catch {
    return;
  }

  await clearCredentials();
  return true;
}
