# mcp-server-apex

MCP server for Searchmind APEX, deployed on Railway as a remote Streamable HTTP service.

**Documentation:** [docs/README.md](./docs/README.md)

## Quick start

```bash
npm install
APEX_API_URL=https://apex.searchmind.tech npm start
```

| Endpoint | Auth |
|----------|------|
| `GET /health` | None |
| `POST /mcp` | `Authorization: Bearer apex_mcp_…` |

## Railway environment

| Variable | Example |
|----------|---------|
| `APEX_API_URL` | `https://apex.searchmind.tech` |

## Connect from Cursor / Claude Code

```json
{
  "mcpServers": {
    "apex": {
      "url": "https://mcp-server-apex-production.up.railway.app/mcp",
      "headers": {
        "Authorization": "Bearer apex_mcp_YOUR_KEY"
      }
    }
  }
}
```

Get keys from **APEX Admin → MCP API Keys**.

**Tools:** `ping`, `list_customers`, `get_merged_sources`

See [docs/endpoints.md](./docs/endpoints.md) for the full API reference and [docs/getting-started.md](./docs/getting-started.md) for setup.
