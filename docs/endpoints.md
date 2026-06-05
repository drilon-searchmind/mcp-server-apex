# Endpoints

## Railway — mcp-server-apex

Base URL: `https://mcp-server-apex-production.up.railway.app`

### `GET /`

Health metadata (no auth).

```json
{
  "name": "mcp-server-apex",
  "version": "0.3.0",
  "status": "ok",
  "mcpEndpoint": "/mcp",
  "oauthDiscovery": "/.well-known/oauth-authorization-server",
  "auth": "OAuth (Claude connector) or Bearer apex_mcp_… on POST /mcp",
  "apexApiConfigured": true,
  "tools": ["ping", "list_customers", "get_merged_sources"]
}
```

### `GET /health`

Plain text `ok` (no auth).

### OAuth (Claude connector)

| Method | Path | Auth |
|--------|------|------|
| GET | `/.well-known/oauth-authorization-server` | None |
| GET | `/.well-known/oauth-protected-resource` | None |
| GET | `/oauth/authorize` | OAuth client_id + PKCE |
| GET | `/oauth/google/callback` | Google (internal) |
| POST | `/oauth/token` | client_id + client_secret |

See [Claude connector OAuth](./claude-connector-oauth.md).

### `POST /mcp`

MCP Streamable HTTP endpoint. Requires authentication.

| Header | Value |
|--------|--------|
| `Authorization` | `Bearer apex_mcp_…` or OAuth JWT |
| `Content-Type` | `application/json` |
| `Accept` | `application/json, text/event-stream` |

---

## APEX — apex.searchmind.tech

All `/api/mcp/*` data routes require:

```
Authorization: Bearer apex_mcp_…
```

(or OAuth JWT from the MCP server token endpoint)

### `POST` `/api/mcp/oauth/verify-client`

Server-to-server only (`X-MCP-Service-Key`). Used by Railway to validate OAuth client credentials.

### `GET` or `POST` `/api/mcp/auth/verify`

Validates an MCP API key.

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

**Example:**

```bash
curl -H "Authorization: Bearer apex_mcp_YOUR_KEY" \
  https://apex.searchmind.tech/api/mcp/auth/verify
```

---

### `GET` `/api/mcp/customers`

List customers (read-only, no API secrets).

| Query param | Type | Default | Description |
|-------------|------|---------|-------------|
| `includeArchived` | `1` or omit | omit | Pass `1` to include archived customers |

**Success `200`:**

```json
{
  "readOnly": true,
  "count": 2,
  "customers": [
    {
      "id": "…",
      "customerName": "Example DK",
      "customerType": "Shopify",
      "isArchived": false,
      "currency": "DKK",
      "revenueDisplayVat": "excl",
      "integrations": {
        "store": true,
        "meta": true,
        "googleAds": true,
        "pinterest": false,
        "snapchat": false,
        "bing": false,
        "reddit": false,
        "klaviyo": false,
        "googleSearchConsole": true,
        "ga4": true
      }
    }
  ]
}
```

**Example:**

```bash
curl -H "Authorization: Bearer apex_mcp_YOUR_KEY" \
  "https://apex.searchmind.tech/api/mcp/customers"
```

---

### `GET` `/api/mcp/merged-sources`

Daily merged revenue + ad spend for one customer (same data shape as dashboards).

| Query param | Required | Format | Description |
|-------------|----------|--------|-------------|
| `customerId` | Yes | MongoDB id | APEX customer id |
| `startDate` | Yes | `YYYY-MM-DD` | Inclusive start |
| `endDate` | Yes | `YYYY-MM-DD` | Inclusive end |

**Limits:** max **366 days** per request.

**Success `200`:** JSON object including:

| Field | Description |
|-------|-------------|
| `readOnly` | Always `true` |
| `customerId`, `customerName`, `customerType` | Customer context |
| `startDate`, `endDate` | Requested range |
| `shopifyDaily` | Daily store revenue rows (all platforms use this key) |
| `facebookDaily`, `googleDaily`, … | Daily ad platform spend |
| `grossProfitNetSales`, `POASTotalSales`, `CACTotalSales` | Period totals |
| `calculationsData` | Breakdown strings used in dashboards |

**Errors:**

| Status | Reason |
|--------|--------|
| `400` | Missing params, invalid dates, range > 366 days |
| `401` | Invalid MCP key |
| `404` | Customer not found |
| `500` | Fetch error |

**Example:**

```bash
curl -H "Authorization: Bearer apex_mcp_YOUR_KEY" \
  "https://apex.searchmind.tech/api/mcp/merged-sources?customerId=CUSTOMER_ID&startDate=2025-06-01&endDate=2025-06-30"
```

---

## MCP tools (via `POST /mcp`)

Registered on the Railway MCP server. AI clients call these through the MCP protocol.

### `ping`

Verify connectivity.

| Input | Type | Description |
|-------|------|-------------|
| `message` | string (optional) | Echoed in response |

**Returns:** `pong` or `pong: {message}`

---

### `list_customers`

Calls `GET /api/mcp/customers` on APEX.

| Input | Type | Description |
|-------|------|-------------|
| `includeArchived` | boolean (optional) | Include archived customers |

**Example prompt:** “Use apex list_customers”

---

### `get_merged_sources`

Calls `GET /api/mcp/merged-sources` on APEX.

| Input | Type | Description |
|-------|------|-------------|
| `customerId` | string | APEX customer id |
| `startDate` | string | `YYYY-MM-DD` |
| `endDate` | string | `YYYY-MM-DD` |

**Example prompt:** “Use get_merged_sources for customer X from 2025-06-01 to 2025-06-30”

---

## Admin (APEX UI only)

| Location | Purpose |
|----------|---------|
| `/admin` → **MCP API Keys** | Generate, list, revoke keys |

Not a public HTTP API — browser UI for admins only.
