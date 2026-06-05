import { randomBytes } from "node:crypto";

/** @typedef {{
 *   clientId: string,
 *   redirectUri: string,
 *   codeChallenge: string,
 *   codeChallengeMethod: string,
 *   keyId: string,
 *   state: string,
 *   createdAt: number,
 * }} PendingAuth */

/** @typedef {{
 *   clientId: string,
 *   redirectUri: string,
 *   codeChallenge: string,
 *   keyId: string,
 *   email: string,
 *   expiresAt: number,
 * }} AuthCode */

/** @type {Map<string, PendingAuth>} */
const pendingByState = new Map();

/** @type {Map<string, AuthCode>} */
const codes = new Map();

const PENDING_TTL_MS = 10 * 60 * 1000;
const CODE_TTL_MS = 5 * 60 * 1000;

function purgeExpired() {
  const now = Date.now();
  for (const [k, v] of pendingByState) {
    if (now - v.createdAt > PENDING_TTL_MS) pendingByState.delete(k);
  }
  for (const [k, v] of codes) {
    if (now > v.expiresAt) codes.delete(k);
  }
}

/**
 * @param {PendingAuth} entry
 */
export function savePendingAuth(entry) {
  purgeExpired();
  pendingByState.set(entry.state, entry);
}

/**
 * @param {string} state
 */
export function consumePendingAuth(state) {
  purgeExpired();
  const row = pendingByState.get(state);
  if (!row) return null;
  pendingByState.delete(state);
  if (Date.now() - row.createdAt > PENDING_TTL_MS) return null;
  return row;
}

/**
 * @param {AuthCode} entry
 * @returns {string}
 */
export function issueAuthCode(entry) {
  purgeExpired();
  const code = randomBytes(24).toString("base64url");
  codes.set(code, {
    ...entry,
    expiresAt: Date.now() + CODE_TTL_MS,
  });
  return code;
}

/**
 * @param {string} code
 */
export function consumeAuthCode(code) {
  purgeExpired();
  const row = codes.get(code);
  if (!row) return null;
  codes.delete(code);
  if (Date.now() > row.expiresAt) return null;
  return row;
}
