# Authentication

## Overview

MCP access uses **API keys** (not APEX user login / NextAuth). Keys are machine-to-machine credentials for AI clients.

| Property | Value |
|----------|--------|
| Key prefix | `apex_mcp_` |
| Storage | bcrypt hash in MongoDB (`McpApiKey` collection) |
| Access | Read-only, all customers |
| Issuance | APEX Admin → MCP API Keys |

## Request flow

1. AI client sends `POST` to Railway `/mcp` with:

   ```
   Authorization: Bearer apex_mcp_…
   ```

2. **mcp-server-apex** forwards that token to APEX:

   ```
   GET https://apex.searchmind.tech/api/mcp/auth/verify
   Authorization: Bearer apex_mcp_…
   ```

3. APEX validates the hash, checks revocation, updates `lastUsedAt`

4. If valid → MCP session proceeds. If not → `401 Unauthorized`

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
| `PORT` | Auto (Railway) | `8080` |

## Security notes

- Never commit keys to git or share in Slack/email
- Revoke and re-issue if a key is exposed
- Keys grant read access to **all** customer data once data tools are enabled
- The public Railway URL is useless without a valid key

## APEX verify endpoint

See [Endpoints](./endpoints.md#apex-verify).
