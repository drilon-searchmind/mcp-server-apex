# Searchmind APEX MCP — Documentation

Remote MCP server for AI tools (Claude Code, Cursor, and other MCP clients) to access **read-only** Searchmind APEX data.

| Document | Description |
|----------|-------------|
| [Getting started](./getting-started.md) | API keys, client setup, example prompts |
| [Authentication](./authentication.md) | API keys + OAuth verification flow |
| [Claude connector OAuth](./claude-connector-oauth.md) | Claude MCP connector setup |
| [Endpoints](./endpoints.md) | **Full API reference** — Railway + APEX + MCP tools |

## Architecture

```
AI client (Claude Code / Cursor)
        │  Authorization: Bearer apex_mcp_…
        ▼
mcp-server-apex (Railway)  — tools: ping, list_customers, get_merged_sources
        │  same Bearer token
        ▼
apex.searchmind.tech (/api/mcp/…)
        ▼
MongoDB + Shopify/Meta/Google/store APIs
```

## Production URLs

| Service | URL |
|---------|-----|
| MCP server | `https://mcp-server-apex-production.up.railway.app` |
| MCP endpoint | `https://mcp-server-apex-production.up.railway.app/mcp` |
| APEX app | `https://apex.searchmind.tech` |

## APEX MCP API summary

| Method | Endpoint | Auth |
|--------|----------|------|
| GET/POST | `/api/mcp/auth/verify` | Bearer |
| GET | `/api/mcp/customers` | Bearer |
| GET | `/api/mcp/merged-sources` | Bearer |

All routes are **read-only**. Details in [Endpoints](./endpoints.md).

## MCP tools

| Tool | Status |
|------|--------|
| `ping` | Available |
| `list_customers` | Available |
| `get_merged_sources` | Available |

## Access model

- Keys created in **APEX Admin → MCP API Keys**
- **Read-only**, all customers
- Shown **once** at creation — store securely
- Revoke anytime in Admin
