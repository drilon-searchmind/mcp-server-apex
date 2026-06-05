/**
 * Validates MCP Bearer tokens against the APEX verify endpoint.
 */

/**
 * @param {import("express").Request} req
 * @returns {string | null}
 */
export function parseBearerToken(req) {
  const auth = req.headers.authorization || "";
  const match = /^Bearer\s+(.+)$/i.exec(auth.trim());
  return match ? match[1].trim() : null;
}

/**
 * @returns {string}
 */
export function getApexApiUrl() {
  const url = String(process.env.APEX_API_URL || "")
    .trim()
    .replace(/\/+$/, "");
  if (!url) {
    throw Object.assign(new Error("APEX_API_URL is not configured"), {
      status: 503,
    });
  }
  return url;
}

/**
 * @param {string} bearerToken
 * @returns {Promise<{ valid: boolean, readOnly?: boolean, scope?: string, keyId?: string, error?: string }>}
 */
export async function verifyKeyWithApex(bearerToken) {
  const base = getApexApiUrl();
  const res = await fetch(`${base}/api/mcp/auth/verify`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${bearerToken}`,
    },
    cache: "no-store",
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.valid) {
    return {
      valid: false,
      error:
        data.error ||
        (res.status === 401
          ? "Invalid or revoked MCP API key"
          : `APEX verify failed (${res.status})`),
    };
  }

  return {
    valid: true,
    readOnly: data.readOnly,
    scope: data.scope,
    keyId: data.keyId,
  };
}

/**
 * Authenticate an incoming MCP HTTP request.
 * @param {import("express").Request} req
 * @returns {Promise<{ readOnly: boolean, scope: string, keyId: string }>}
 */
export async function authenticateMcpRequest(req) {
  const token = parseBearerToken(req);
  if (!token) {
    throw Object.assign(
      new Error("Missing Authorization Bearer token"),
      { status: 401 }
    );
  }

  let result;
  try {
    result = await verifyKeyWithApex(token);
  } catch (e) {
    console.error("[mcp auth] APEX verify request failed:", e);
    throw Object.assign(
      new Error("Could not verify MCP API key with APEX"),
      { status: 502 }
    );
  }

  if (!result.valid) {
    throw Object.assign(
      new Error(result.error || "Invalid or revoked MCP API key"),
      { status: 401 }
    );
  }

  return {
    readOnly: result.readOnly !== false,
    scope: result.scope || "all",
    keyId: result.keyId || "",
  };
}
