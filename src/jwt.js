import crypto from "node:crypto";

const JWT_TYP = "mcp_oauth";
const DEFAULT_TTL_SEC = 60 * 60 * 24 * 7; // 7 days

function getJwtSecret() {
  const s = String(process.env.MCP_OAUTH_JWT_SECRET || "").trim();
  if (!s || s.length < 32) {
    throw new Error("MCP_OAUTH_JWT_SECRET must be set (min 32 characters)");
  }
  return s;
}

function b64urlJson(obj) {
  return Buffer.from(JSON.stringify(obj)).toString("base64url");
}

/**
 * @param {{
 *   keyId: string,
 *   clientId: string,
 *   email: string,
 *   issuer: string,
 *   expiresInSec?: number,
 * }} input
 */
export function signMcpOAuthJwt(input) {
  const secret = getJwtSecret();
  const header = b64urlJson({ alg: "HS256", typ: "JWT" });
  const exp =
    Math.floor(Date.now() / 1000) + (input.expiresInSec || DEFAULT_TTL_SEC);
  const payload = b64urlJson({
    typ: JWT_TYP,
    sub: input.keyId,
    keyId: input.keyId,
    client_id: input.clientId,
    email: input.email,
    readOnly: true,
    scope: "all",
    iss: input.issuer,
    exp,
  });
  const data = `${header}.${payload}`;
  const sig = crypto.createHmac("sha256", secret).update(data).digest("base64url");
  return `${data}.${sig}`;
}

/**
 * @param {string} token
 */
export function verifyMcpOAuthJwt(token) {
  const secret = getJwtSecret();
  const parts = String(token || "").split(".");
  if (parts.length !== 3) return null;

  const [headerB64, payloadB64, sigB64] = parts;
  const data = `${headerB64}.${payloadB64}`;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(data)
    .digest("base64url");

  if (expected !== sigB64) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf8")
    );
    if (payload.typ !== JWT_TYP) return null;
    if (payload.exp && Date.now() / 1000 > Number(payload.exp)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function looksLikeJwt(token) {
  const parts = String(token || "").split(".");
  return parts.length === 3 && parts.every((p) => p.length > 0);
}
