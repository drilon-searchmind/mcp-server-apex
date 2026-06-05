# Authentication

## Overview

Two auth modes:

1. **API key (Bearer)** — Claude Code CLI, Cursor, curl
2. **OAuth 2.0** — Claude MCP connector (Google `@searchmind.dk` + pre-issued client id/secret)

Credentials are issued in **APEX Admin → MCP API Keys** (API key + OAuth client id/secret per row).

| Property | API key | OAuth |
|----------|---------|-------|
| Prefix | `apex_mcp_` | `apex_oauth_` / `apex_oauth_secret_` |
| Storage | bcrypt in MongoDB | Same `McpApiKey` document |
| Access | Read-only, all customers | Same |

See [Claude connector OAuth](./claude-connector-oauth.md) for connector setup.

## API key flow

1. Client sends `POST` to Railway `/mcp` with `Authorization: Bearer apex_mcp_…`
2. **mcp-server-apex** verifies via APEX `GET /api/mcp/auth/verify`
3. If valid → MCP session proceeds

## OAuth flow

1. Claude reads `/.well-known/oauth-authorization-server` on the MCP host
2. User authorizes at `/oauth/authorize` (PKCE + Google login)
3. Claude exchanges code at `POST /oauth/token` with client id + secret
4. MCP server returns a JWT; subsequent `/mcp` requests use `Authorization: Bearer <jwt>`
5. APEX validates JWT signature + linked key not revoked

## Error responses (Railway `/mcp`)

| Status | Meaning |
|--------|---------|
| `401` | Missing, invalid, or revoked key |
| `502` | Railway could not reach APEX verify |
| `503` | `APEX_API_URL` not set on Railway |

Example:

```json
{
  "error": "Unauthorized",
  "message": "Invalid or revoked MCP API key"
}
```

## Environment variables (Railway)

| Variable | Required | Example |
|----------|----------|---------|
| `APEX_API_URL` | Yes | `https://apex.searchmind.tech` |
| `MCP_PUBLIC_URL` | Yes (OAuth) | `https://mcp-server-apex-production.up.railway.app` |
| `MCP_SERVICE_SECRET` | Yes (OAuth) | Shared with APEX |
| `MCP_OAUTH_JWT_SECRET` | Yes (OAuth) | ≥32 chars, shared with APEX |
| `GOOGLE_CLIENT_ID` | Yes (OAuth) | Google OAuth web client |
| `GOOGLE_CLIENT_SECRET` | Yes (OAuth) | |
| `ALLOWED_EMAIL_DOMAIN` | No | `searchmind.dk` |
| `PORT` | Auto (Railway) | `8080` |

## Security notes

- Never commit keys to git or share in Slack/email
- Revoke and re-issue if a key is exposed
- Keys grant read access to **all** customer data once data tools are enabled
- The public Railway URL is useless without a valid key

## APEX MCP API routes

All require the same Bearer token. See [Endpoints](./endpoints.md).

| Route | Purpose |
|-------|---------|
| `/api/mcp/auth/verify` | Validate key |
| `/api/mcp/customers` | List customers (no secrets) |
| `/api/mcp/merged-sources` | Daily revenue + ad spend |
