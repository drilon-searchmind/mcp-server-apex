/**
 * Validates MCP Bearer tokens (API keys via APEX, OAuth JWT locally).
 */

import { looksLikeJwt, verifyMcpOAuthJwt } from "./jwt.js";

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
          ? "Invalid or revoked MCP credentials"
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
 * @param {string} token
 */
async function verifyOAuthJwtToken(token) {
  const payload = verifyMcpOAuthJwt(token);
  if (!payload?.keyId) {
    return { valid: false, error: "Invalid OAuth access token" };
  }

  return {
    valid: true,
    readOnly: true,
    scope: "all",
    keyId: payload.keyId,
    email: payload.email || null,
    authMethod: "oauth",
  };
}

/**
 * Authenticate an incoming MCP HTTP request.
 * @param {import("express").Request} req
 * @returns {Promise<{ readOnly: boolean, scope: string, keyId: string, authMethod?: string }>}
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
    if (looksLikeJwt(token)) {
      result = await verifyOAuthJwtToken(token);
    } else {
      result = await verifyKeyWithApex(token);
    }
  } catch (e) {
    console.error("[mcp auth] verify request failed:", e);
    throw Object.assign(
      new Error("Could not verify MCP credentials with APEX"),
      { status: 502 }
    );
  }

  if (!result.valid) {
    throw Object.assign(
      new Error(result.error || "Invalid or revoked MCP credentials"),
      { status: 401 }
    );
  }

  return {
    readOnly: result.readOnly !== false,
    scope: result.scope || "all",
    keyId: result.keyId || "",
    authMethod: result.authMethod || "api_key",
  };
}
