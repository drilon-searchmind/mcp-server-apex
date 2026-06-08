# Claude connector (OAuth)

Claude’s MCP **connector** uses OAuth 2.0 with **Google SSO** (`@searchmind.dk` only) — the same Google OAuth client as APEX login.

## 1. Configure Claude connector

| Field | Value |
|-------|--------|
| MCP server URL | `https://mcp-server-apex-production.up.railway.app/mcp` |
| OAuth Client ID | Your **SSO Google Client ID** (`SSO_GOOGLE_CLIENT_ID` — ends with `.apps.googleusercontent.com`) |
| OAuth Client Secret | **Leave empty** (public client + PKCE) |

Claude discovers OAuth via:

```
GET https://mcp-server-apex-production.up.railway.app/.well-known/oauth-authorization-server
```

Sign-in redirects through Google; only `@searchmind.dk` accounts receive an access token.

## 2. Prerequisites

1. At least **one active MCP key** in APEX Admin → MCP API Keys (used server-side for access control).
2. Optional: set `MCP_OAUTH_KEY_ID` on **Vercel** to a specific key’s MongoDB id; otherwise the newest active key is used.
3. **Vercel** must have `SSO_GOOGLE_CLIENT_ID` set (same value as APEX login).

## 3. Alternative: apex_oauth credentials

You can still use `apex_oauth_…` / `apex_oauth_secret_…` from APEX Admin if you prefer per-connector credentials.

## 4. Claude Code CLI (no OAuth)

```powershell
claude mcp add --transport http apex https://mcp-server-apex-production.up.railway.app/mcp --header "Authorization: Bearer apex_mcp_YOUR_KEY"
```

## Environment variables

### Railway (mcp-server-apex)

| Variable | Required | Description |
|----------|----------|-------------|
| `APEX_API_URL` | Yes | `https://apex.searchmind.tech` |
| `MCP_PUBLIC_URL` | Yes | Public Railway URL, e.g. `https://mcp-server-apex-production.up.railway.app` |
| `MCP_SERVICE_SECRET` | Yes | Shared with APEX (server-to-server) |
| `MCP_OAUTH_JWT_SECRET` | Yes | ≥32 chars, **same value on APEX** |
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth web client |
| `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth web client |
| `ALLOWED_EMAIL_DOMAIN` | No | Default `searchmind.dk` |

### Google Cloud Console

Add authorized redirect URI:

```
https://mcp-server-apex-production.up.railway.app/oauth/google/callback
```

### Vercel (APEX)

| Variable | Required |
|----------|----------|
| `MCP_SERVICE_SECRET` | Yes (match Railway) |
| `MCP_OAUTH_JWT_SECRET` | Yes (match Railway) |
| `SSO_GOOGLE_CLIENT_ID` | Yes (must match Claude connector OAuth Client ID) |
| `MCP_OAUTH_KEY_ID` | No (MongoDB id of MCP key; defaults to newest active key) |

## OAuth endpoints (Railway)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/.well-known/oauth-authorization-server` | OAuth metadata (Claude discovery) |
| GET | `/.well-known/oauth-protected-resource` | MCP resource metadata |
| GET | `/oauth/authorize` | Start OAuth (PKCE + Google login) |
| GET | `/oauth/google/callback` | Google callback (internal) |
| POST | `/oauth/token` | Exchange code for JWT access token |

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| “Couldn't register with sign-in service” | Ensure `MCP_PUBLIC_URL` is set and `/.well-known/oauth-authorization-server` returns JSON (not a Cloudflare/login page) |
| Invalid OAuth client | Ensure `SSO_GOOGLE_CLIENT_ID` is set on **Vercel**; at least one active MCP key in APEX |
| Google redirect error | Add Railway callback URL in Google Cloud |
| Only @searchmind.dk | Sign in with a Searchmind Google account |
| 503 on token verify | Set `MCP_OAUTH_JWT_SECRET` on both Vercel and Railway |
