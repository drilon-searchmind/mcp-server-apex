# Claude connector (OAuth)

Claude’s MCP **connector** expects the MCP server to speak OAuth 2.0 — not just a static Bearer API key. This server implements that flow with Google Workspace sign-in (`@searchmind.dk` only).

## 1. Generate credentials in APEX

1. Log in to [APEX](https://apex.searchmind.tech) as **admin**
2. **Admin → MCP API Keys → Generate MCP credentials**
3. Copy all three values (shown once):
   - **API key** — `apex_mcp_…` (CLI / manual Bearer header)
   - **OAuth Client ID** — `apex_oauth_…`
   - **OAuth Client Secret** — `apex_oauth_secret_…`

Keys created before OAuth was added have no client id — revoke and create a new set.

## 2. Configure Claude connector

| Field | Value |
|-------|--------|
| MCP server URL | `https://mcp-server-apex-production.up.railway.app/mcp` |
| OAuth Client ID | From APEX admin (step 1) |
| OAuth Client Secret | From APEX admin (step 1) |

Claude discovers OAuth via:

```
GET https://mcp-server-apex-production.up.railway.app/.well-known/oauth-authorization-server
```

Sign-in redirects through Google; only `@searchmind.dk` accounts receive an access token.

## 3. Alternative: Claude Code CLI (no OAuth)

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
| Invalid OAuth client | Use Client ID/Secret from a **new** APEX key; check key is not revoked |
| Google redirect error | Add Railway callback URL in Google Cloud |
| Only @searchmind.dk | Sign in with a Searchmind Google account |
| 503 on token verify | Set `MCP_OAUTH_JWT_SECRET` on both Vercel and Railway |
