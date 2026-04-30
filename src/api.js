import { BASE_URL, clearCredentials } from "./config.js";
import { getValidTokens } from "./auth.js";

async function request(method, path, { body, params } = {}) {
  const tokens = await getValidTokens();

  if (!tokens) {
    throw new Error("Not authenticated. Run: insighta login");
  }

  let url = `${BASE_URL}${path}`;
  if (params) {
    const qs = new URLSearchParams(params).toString();
    if (qs) url += `?${qs}`;
  }

  const options = {
    method,
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
      "X-API-Version": "1",
      "Content-Type": "application/json",
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(url, options);

  if (res.status === 401) {
    await clearCredentials();
    throw new Error("Session expired. Run: insighta login");
  }

  return res;
}

export async function getMe() {
  const res = await request("GET", "/api/users/me");
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? "Failed to fetch user info");
  return data.data;
}

export async function listProfiles(filters = {}) {
  const params = Object.fromEntries(
    Object.entries(filters).filter(
      ([, v]) => v !== undefined && v !== null && v !== "",
    ),
  );

  const res = await request("GET", "/api/profiles", { params });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? "Failed to fetch profiles");
  return data;
}

export async function getProfile(id) {
  const res = await request("GET", `/api/profiles/${id}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? "Profile not found");
  return data.data;
}

export async function searchProfiles(query, { page, limit } = {}) {
  const params = { q: query };
  if (page) params.page = page;
  if (limit) params.limit = limit;

  const res = await request("GET", "/api/profiles/search", { params });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? "Search failed");
  return data;
}

export async function createProfile(name) {
  const res = await request("POST", "/api/profiles", { body: { name } });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? "Failed to create profile");
  return data.data;
}

export async function exportProfiles(filters = {}) {
  const params = Object.fromEntries(
    Object.entries(filters).filter(
      ([, v]) => v !== undefined && v !== null && v !== "",
    ),
  );

  const res = await request("GET", "/api/profiles/export", { params });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.message ?? "Export failed");
  }

  const disposition = res.headers.get("content-disposition") ?? "";
  const match = disposition.match(/filename="?([^"]+)"?/);
  const filename = match?.[1] ?? `profiles_${Date.now()}.csv`;

  const csvText = await res.text();
  return { filename, csvText };
}
