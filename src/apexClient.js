import { getApexApiUrl } from "./apexAuth.js";

function getMcpServiceSecret() {
  const s = String(process.env.MCP_SERVICE_SECRET || "").trim();
  if (!s) throw new Error("MCP_SERVICE_SECRET is not configured");
  return s;
}

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
 * @param {string} bearerToken
 * @param {string} path
 * @param {Record<string, unknown>} body
 */
export async function apexPost(bearerToken, path, body = {}) {
  const base = getApexApiUrl();
  const url = new URL(path.startsWith("/") ? path : `/${path}`, base);

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${bearerToken}`,
    },
    body: JSON.stringify(body),
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
 * @param {{ clientId: string, clientSecret?: string }} body
 */
export async function apexVerifyOAuthClient(body) {
  const base = getApexApiUrl();
  const res = await fetch(`${base}/api/mcp/oauth/verify-client`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-MCP-Service-Key": getMcpServiceSecret(),
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.valid) {
    return { valid: false, error: data.error || "Invalid OAuth client" };
  }
  return { valid: true, ...data };
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

/**
 * Return MCP tool error content with full APEX JSON body when available.
 * @param {string} toolName
 * @param {unknown} error
 */
export function apexToolErrorResult(toolName, error) {
  const err = /** @type {{ message?: string, status?: number, data?: Record<string, unknown> }} */ (
    error
  );
  const message = err?.message || String(error);
  const data = err?.data;

  if (data && typeof data === "object" && !Array.isArray(data)) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              tool: toolName,
              ok: false,
              status: err?.status ?? null,
              ...data,
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }

  return {
    content: [{ type: "text", text: `${toolName} failed: ${message}` }],
    isError: true,
  };
}
