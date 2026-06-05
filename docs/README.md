# Searchmind APEX MCP — Documentation

Remote MCP server for AI tools (Claude Code, Cursor, and other MCP clients) to access **read-only** Searchmind APEX data.

| Document | Description |
|----------|-------------|
| [Getting started](./getting-started.md) | API keys, client setup, first test |
| [Authentication](./authentication.md) | How keys work and how verification flows |
| [Endpoints](./endpoints.md) | Railway + APEX HTTP endpoints and MCP tools |

## Architecture

```
AI client (Claude Code / Cursor)
        │  Authorization: Bearer apex_mcp_…
        ▼
mcp-server-apex (Railway)
        │  verifies key via APEX
        ▼
apex.searchmind.tech (/api/mcp/…)
        │  read-only data APIs (coming soon)
        ▼
Customers, merged sources, dashboards data
```

## Production URLs

| Service | URL |
|---------|-----|
| MCP server | `https://mcp-server-apex-production.up.railway.app` |
| MCP endpoint | `https://mcp-server-apex-production.up.railway.app/mcp` |
| APEX app | `https://apex.searchmind.tech` |

## Access model

- Keys are created in **APEX Admin → MCP API Keys**
- Each key is **read-only** with access to **all customers**
- Keys are shown **once** at creation — store them securely
- Revoked keys stop working immediately

## Current MCP tools

| Tool | Status |
|------|--------|
| `ping` | Available |
| `list_customers` | Planned |
| `get_merged_sources` | Planned |

See [Endpoints](./endpoints.md) for details.
