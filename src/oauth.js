import { createHash, randomBytes } from "node:crypto";

import { apexVerifyOAuthClient } from "./apexClient.js";
import { signMcpOAuthJwt } from "./jwt.js";
import {
  consumeAuthCode,
  consumePendingAuth,
  issueAuthCode,
  savePendingAuth,
} from "./oauthStore.js";

export function getPublicBaseUrl() {
  const url = String(process.env.MCP_PUBLIC_URL || "").trim().replace(/\/+$/, "");
  if (!url) {
    throw new Error("MCP_PUBLIC_URL is not configured");
  }
  return url;
}

function getGoogleClientId() {
  return String(
    process.env.GOOGLE_OAUTH_CLIENT_ID ||
      process.env.GOOGLE_CLIENT_ID ||
      process.env.SSO_GOOGLE_CLIENT_ID ||
      ""
  ).trim();
}

function getGoogleClientSecret() {
  return String(
    process.env.GOOGLE_OAUTH_CLIENT_SECRET ||
      process.env.GOOGLE_CLIENT_SECRET ||
      process.env.SSO_GOOGLE_CLIENT_SECRET ||
      ""
  ).trim();
}

function googleOAuthConfigError() {
  const id = getGoogleClientId();
  const secret = getGoogleClientSecret();
  if (!id && !secret) {
    return "Google OAuth not configured — set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET on Railway (mcp-server-apex)";
  }
  if (!id) {
    return "Google OAuth not configured — GOOGLE_CLIENT_ID is missing on Railway";
  }
  if (!secret) {
    return "Google OAuth not configured — GOOGLE_CLIENT_SECRET is missing on Railway (client id is set; secret is required for callback)";
  }
  return null;
}

function getAllowedEmailDomain() {
  return String(process.env.ALLOWED_EMAIL_DOMAIN || "searchmind.dk")
    .trim()
    .toLowerCase()
    .replace(/^@/, "");
}

function oauthMetadata(base) {
  return {
    issuer: base,
    authorization_endpoint: `${base}/oauth/authorize`,
    token_endpoint: `${base}/oauth/token`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code"],
    code_challenge_methods_supported: ["S256"],
    scopes_supported: ["mcp:read"],
    token_endpoint_auth_methods_supported: [
      "none",
      "client_secret_post",
      "client_secret_basic",
    ],
  };
}

function protectedResourceMetadata(base) {
  return {
    resource: `${base}/mcp`,
    authorization_servers: [base],
    bearer_methods_supported: ["header"],
    scopes_supported: ["mcp:read"],
  };
}

function verifyPkce(codeVerifier, codeChallenge, method) {
  if (method !== "S256") return false;
  const digest = createHash("sha256").update(codeVerifier).digest("base64url");
  return digest === codeChallenge;
}

function parseClientCredentials(req) {
  let clientId = req.body?.client_id || req.query?.client_id;
  let clientSecret = req.body?.client_secret || req.query?.client_secret;

  const auth = req.headers.authorization || "";
  const basic = /^Basic\s+(.+)$/i.exec(auth.trim());
  if (basic) {
    try {
      const decoded = Buffer.from(basic[1], "base64").toString("utf8");
      const idx = decoded.indexOf(":");
      if (idx >= 0) {
        clientId = clientId || decoded.slice(0, idx);
        clientSecret = clientSecret || decoded.slice(idx + 1);
      }
    } catch {
      /* ignore */
    }
  }

  return {
    clientId: String(clientId || "").trim(),
    clientSecret: String(clientSecret || "").trim(),
  };
}

/**
 * @param {import("express").Express} app
 */
export function mountOAuthRoutes(app) {
  app.get("/.well-known/oauth-authorization-server", (_req, res) => {
    try {
      const base = getPublicBaseUrl();
      res.json(oauthMetadata(base));
    } catch (e) {
      res.status(503).json({ error: e.message });
    }
  });

  app.get("/.well-known/openid-configuration", (_req, res) => {
    try {
      const base = getPublicBaseUrl();
      res.json(oauthMetadata(base));
    } catch (e) {
      res.status(503).json({ error: e.message });
    }
  });

  app.get("/.well-known/oauth-protected-resource", (_req, res) => {
    try {
      const base = getPublicBaseUrl();
      res.json(protectedResourceMetadata(base));
    } catch (e) {
      res.status(503).json({ error: e.message });
    }
  });

  app.get("/oauth/authorize", async (req, res) => {
    try {
      const base = getPublicBaseUrl();
      const clientId = String(req.query.client_id || "").trim();
      const redirectUri = String(req.query.redirect_uri || "").trim();
      const state = String(req.query.state || randomBytes(16).toString("base64url"));
      const codeChallenge = String(req.query.code_challenge || "").trim();
      const codeChallengeMethod = String(
        req.query.code_challenge_method || "S256"
      ).trim();
      const responseType = String(req.query.response_type || "code").trim();

      if (!clientId || !redirectUri) {
        return res.status(400).send("Missing client_id or redirect_uri");
      }
      if (responseType !== "code") {
        return res.status(400).send("Unsupported response_type");
      }
      if (!codeChallenge || codeChallengeMethod !== "S256") {
        return res.status(400).send("PKCE S256 required");
      }

      const client = await apexVerifyOAuthClient({ clientId });
      if (!client.valid) {
        return res
          .status(401)
          .send(
            "Invalid OAuth client_id — use your Google SSO Client ID (SSO_GOOGLE_CLIENT_ID) in Claude, " +
              "or an apex_oauth_… client from APEX Admin → MCP API Keys. " +
              "Ensure at least one active MCP key exists in APEX."
          );
      }

      savePendingAuth({
        clientId,
        redirectUri,
        codeChallenge,
        codeChallengeMethod,
        keyId: client.keyId,
        state,
        createdAt: Date.now(),
      });

      const googleErr = googleOAuthConfigError();
      if (googleErr) {
        return res.status(503).send(googleErr);
      }

      const googleClientId = getGoogleClientId();
      const googleRedirect = `${base}/oauth/google/callback`;
      const googleUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      googleUrl.searchParams.set("client_id", googleClientId);
      googleUrl.searchParams.set("redirect_uri", googleRedirect);
      googleUrl.searchParams.set("response_type", "code");
      googleUrl.searchParams.set("scope", "openid email profile");
      googleUrl.searchParams.set("state", state);
      googleUrl.searchParams.set("prompt", "select_account");

      return res.redirect(googleUrl.toString());
    } catch (e) {
      console.error("[oauth authorize]", e);
      return res.status(500).send("Authorization failed");
    }
  });

  app.get("/oauth/google/callback", async (req, res) => {
    try {
      const state = String(req.query.state || "");
      const googleCode = String(req.query.code || "");
      const pending = consumePendingAuth(state);

      if (!pending || !googleCode) {
        return res.status(400).send("Invalid or expired OAuth state");
      }

      const googleErr = googleOAuthConfigError();
      if (googleErr) {
        return res.status(503).send(googleErr);
      }

      const googleClientId = getGoogleClientId();
      const googleClientSecret = getGoogleClientSecret();
      const base = getPublicBaseUrl();

      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code: googleCode,
          client_id: googleClientId,
          client_secret: googleClientSecret,
          redirect_uri: `${base}/oauth/google/callback`,
          grant_type: "authorization_code",
        }),
      });

      const tokenData = await tokenRes.json().catch(() => ({}));
      if (!tokenRes.ok || !tokenData.access_token) {
        console.error("[oauth google token]", tokenData);
        const googleError = tokenData.error || "unknown";
        const googleDesc = tokenData.error_description || "";
        return res
          .status(502)
          .send(
            `Google token exchange failed (${googleError}${googleDesc ? `: ${googleDesc}` : ""}). ` +
              "Check Railway: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be a matching pair from the same Google OAuth client, " +
              "and that client must have redirect URI " +
              `${base}/oauth/google/callback`
          );
      }

      const userRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const user = await userRes.json().catch(() => ({}));
      const email = String(user.email || "").trim().toLowerCase();
      const domain = getAllowedEmailDomain();

      if (!email || !email.endsWith(`@${domain}`)) {
        return res
          .status(403)
          .send(`Only @${domain} Google accounts are allowed`);
      }

      const authCode = issueAuthCode({
        clientId: pending.clientId,
        redirectUri: pending.redirectUri,
        codeChallenge: pending.codeChallenge,
        keyId: pending.keyId,
        email,
        expiresAt: 0,
      });

      const redirect = new URL(pending.redirectUri);
      redirect.searchParams.set("code", authCode);
      if (pending.state) redirect.searchParams.set("state", pending.state);

      return res.redirect(redirect.toString());
    } catch (e) {
      console.error("[oauth google callback]", e);
      return res.status(500).send("Google callback failed");
    }
  });

  app.post("/oauth/token", async (req, res) => {
    try {
      const grantType = String(req.body?.grant_type || "").trim();
      if (grantType !== "authorization_code") {
        return res.status(400).json({ error: "unsupported_grant_type" });
      }

      const code = String(req.body?.code || "").trim();
      const redirectUri = String(req.body?.redirect_uri || "").trim();
      const codeVerifier = String(req.body?.code_verifier || "").trim();
      const { clientId, clientSecret } = parseClientCredentials(req);

      if (!code || !redirectUri || !codeVerifier || !clientId) {
        return res.status(400).json({ error: "invalid_request" });
      }

      const client = await apexVerifyOAuthClient({
        clientId,
        clientSecret: clientSecret || undefined,
      });
      if (!client.valid) {
        return res.status(401).json({ error: "invalid_client" });
      }

      const authRow = consumeAuthCode(code);
      if (!authRow) {
        return res.status(400).json({ error: "invalid_grant" });
      }

      if (
        authRow.clientId !== clientId ||
        authRow.redirectUri !== redirectUri ||
        authRow.keyId !== client.keyId
      ) {
        return res.status(400).json({ error: "invalid_grant" });
      }

      if (!verifyPkce(codeVerifier, authRow.codeChallenge, "S256")) {
        return res.status(400).json({ error: "invalid_grant" });
      }

      const base = getPublicBaseUrl();
      const accessToken = signMcpOAuthJwt({
        keyId: client.keyId,
        clientId,
        email: authRow.email,
        issuer: base,
      });

      return res.json({
        access_token: accessToken,
        token_type: "Bearer",
        expires_in: 60 * 60 * 24 * 7,
        scope: "mcp:read",
      });
    } catch (e) {
      console.error("[oauth token]", e);
      return res.status(500).json({ error: "server_error" });
    }
  });
}
