import { test, describe, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { randomBytes, createHash } from "node:crypto";
import { homedir } from "node:os";
import { join } from "node:path";
import { rm, readFile } from "node:fs/promises";

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

function generatePKCE() {
  const code_verifier = randomBytes(32).toString("base64url");
  const code_challenge = createHash("sha256")
    .update(code_verifier)
    .digest("base64url");
  return { code_verifier, code_challenge };
}

function makeJwt(payload) {
  const header = Buffer.from(
    JSON.stringify({ alg: "HS256", typ: "JWT" }),
  ).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.fakesig`;
}

describe("PKCE", () => {
  test("generates a base64url code_verifier of 43 characters", () => {
    const { code_verifier } = generatePKCE();
    assert.match(code_verifier, /^[A-Za-z0-9\-_]+$/);
    assert.equal(code_verifier.length, 43);
  });

  test("code_challenge is SHA-256(code_verifier) base64url-encoded", () => {
    const { code_verifier, code_challenge } = generatePKCE();
    const expected = createHash("sha256")
      .update(code_verifier)
      .digest("base64url");
    assert.equal(code_challenge, expected);
  });

  test("each call produces a unique code_verifier", () => {
    const { code_verifier: a } = generatePKCE();
    const { code_verifier: b } = generatePKCE();
    assert.notEqual(a, b);
  });

  test("code_challenge does not contain padding (=) or + or /", () => {
    for (let i = 0; i < 10; i++) {
      const { code_challenge } = generatePKCE();
      assert.doesNotMatch(code_challenge, /[+/=]/);
    }
  });
});

describe("decodeJwtPayload", () => {
  test("decodes a valid JWT payload", () => {
    const token = makeJwt({
      sub: "user123",
      username: "MyITjournal",
      exp: 9999999999,
    });
    const payload = decodeJwtPayload(token);
    assert.equal(payload.sub, "user123");
    assert.equal(payload.username, "MyITjournal");
  });

  test("returns null for a malformed token", () => {
    assert.equal(decodeJwtPayload("not.a.jwt"), null);
    assert.equal(decodeJwtPayload(""), null);
    assert.equal(decodeJwtPayload(null), null);
  });

  test("returns null if payload segment is not valid base64url JSON", () => {
    const result = decodeJwtPayload("header.!!!.sig");
    assert.equal(result, null);
  });
});

describe("isTokenExpiringSoon", () => {
  test("returns false for a token expiring far in the future", () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const token = makeJwt({ exp: futureExp });
    assert.equal(isTokenExpiringSoon(token), false);
  });

  test("returns true for a token expiring within the buffer window", () => {
    const soonExp = Math.floor(Date.now() / 1000) + 10;
    const token = makeJwt({ exp: soonExp });
    assert.equal(isTokenExpiringSoon(token, 30), true);
  });

  test("returns true for an already-expired token", () => {
    const pastExp = Math.floor(Date.now() / 1000) - 60;
    const token = makeJwt({ exp: pastExp });
    assert.equal(isTokenExpiringSoon(token), true);
  });

  test("returns true if token has no exp claim", () => {
    const token = makeJwt({ sub: "user" });
    assert.equal(isTokenExpiringSoon(token), true);
  });

  test("returns true for a malformed token", () => {
    assert.equal(isTokenExpiringSoon("garbage"), true);
  });
});

describe("credentials", () => {
  const CREDENTIALS_FILE = join(homedir(), ".insighta", "credentials.json");

  async function getConfig() {
    return import("./src/config.js");
  }

  beforeEach(async () => {
    const { clearCredentials } = await getConfig();
    await clearCredentials();
  });

  after(async () => {
    const { clearCredentials } = await getConfig();
    await clearCredentials();
  });

  test("saveCredentials writes JSON to disk", async () => {
    const { saveCredentials } = await getConfig();
    const data = {
      access_token: "tok_a",
      refresh_token: "tok_r",
      username: "test",
    };
    await saveCredentials(data);
    const raw = await readFile(CREDENTIALS_FILE, "utf8");
    const parsed = JSON.parse(raw);
    assert.equal(parsed.access_token, "tok_a");
    assert.equal(parsed.username, "test");
  });

  test("loadCredentials returns null when no file exists", async () => {
    const { loadCredentials } = await getConfig();
    const result = await loadCredentials();
    assert.equal(result, null);
  });

  test("loadCredentials returns saved credentials", async () => {
    const { saveCredentials, loadCredentials } = await getConfig();
    await saveCredentials({
      access_token: "a",
      refresh_token: "b",
      username: "u",
    });
    const result = await loadCredentials();
    assert.equal(result.access_token, "a");
    assert.equal(result.username, "u");
  });

  test("clearCredentials removes the file", async () => {
    const { saveCredentials, clearCredentials, loadCredentials } =
      await getConfig();
    await saveCredentials({
      access_token: "x",
      refresh_token: "y",
      username: "z",
    });
    await clearCredentials();
    const result = await loadCredentials();
    assert.equal(result, null);
  });

  test("clearCredentials does not throw if file does not exist", async () => {
    const { clearCredentials } = await getConfig();
    await assert.doesNotReject(() => clearCredentials());
  });
});
