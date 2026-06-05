import { getApexApiUrl } from "./apexAuth.js";

/**
 * @param {string} bearerToken
 * @param {string} path - e.g. /api/mcp/customers
 * @param {Record<string, string | undefined>} [query]
 */
export async function apexGet(bearerToken, path, query = {}) {
  const base = getApexApiUrl();
  const url = new URL(path.startsWith("/") ? path : `/${path}`, base);

  for (const [key, value] of Object.entries(query)) {
    if (value != null && String(value).trim() !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${bearerToken}`,
    },
    cache: "no-store",
  });

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { error: text?.slice(0, 500) || "Invalid JSON from APEX" };
  }

  if (!res.ok) {
    const err = new Error(data.error || data.message || `APEX ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

/**
 * @param {unknown} data
 */
export function jsonToolResult(data) {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}
