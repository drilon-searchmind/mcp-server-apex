# Endpoints

## Railway — mcp-server-apex

Base URL: `https://mcp-server-apex-production.up.railway.app`

### `GET /`

Health metadata (no auth).

```json
{
  "name": "mcp-server-apex",
  "status": "ok",
  "mcpEndpoint": "/mcp",
  "auth": "Bearer apex_mcp_… required on POST /mcp",
  "apexApiConfigured": true
}
```

### `GET /health`

Plain text `ok` (no auth). For uptime checks.

### `POST /mcp`

**MCP Streamable HTTP endpoint.** Requires authentication.

| Header | Value |
|--------|--------|
| `Authorization` | `Bearer apex_mcp_…` |
| `Content-Type` | `application/json` |

Handles MCP protocol messages (initialize, tools/list, tools/call, etc.) per the [Model Context Protocol](https://modelcontextprotocol.io/).

---

## APEX — apex.searchmind.tech

### `GET` or `POST` `/api/mcp/auth/verify`

Validates an MCP API key. Called by Railway; can also be tested with curl.

| Header | Value |
|--------|--------|
| `Authorization` | `Bearer apex_mcp_…` |

**Success `200`:**

```json
{
  "valid": true,
  "readOnly": true,
  "scope": "all",
  "keyId": "6a22ba641f6e83c0112d36c2"
}
```

**Failure `401`:**

```json
{
  "valid": false,
  "error": "Invalid or revoked MCP API key"
}
```

### Planned APEX data endpoints

These will be added on APEX and called by MCP tools (same Bearer auth):

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/mcp/customers` | List customers (no secrets) |
| `GET` | `/api/mcp/merged-sources` | Query params: `customerId`, `startDate`, `endDate` |

---

## MCP tools (Railway)

Tools exposed to AI clients via the MCP protocol.

### `ping` ✅ Available

| Field | Type | Description |
|-------|------|-------------|
| `message` | string (optional) | Echoed in the response |

**Returns:** `pong` or `pong: {message}`

**Example prompt:** “Use apex ping with message test”

### `list_customers` 🔜 Planned

List all APEX customers (id, name, type, integrations summary).

### `get_merged_sources` 🔜 Planned

Daily merged revenue + ad spend for a customer and date range (same shape as dashboards).

---

## Admin (APEX UI only)

| Location | Purpose |
|----------|---------|
| `/admin` → **MCP API Keys** | Generate, list, revoke keys |

Not an HTTP API — browser UI for admins only.
