# Getting started

## 1. Get an MCP API key

1. Log in to [APEX](https://apex.searchmind.tech) as an **admin**
2. Open **Admin → MCP API Keys**
3. Optionally add a label (e.g. `Claude Code — team`)
4. Click **Generate MCP key**
5. **Copy the key immediately** — it starts with `apex_mcp_` and is never shown again

## 2. Verify the key (optional)

```bash
curl -H "Authorization: Bearer apex_mcp_YOUR_KEY" \
  https://apex.searchmind.tech/api/mcp/auth/verify
```

## 3. Test APEX data endpoints (optional)

**List customers:**

```bash
curl -H "Authorization: Bearer apex_mcp_YOUR_KEY" \
  https://apex.searchmind.tech/api/mcp/customers
```

**Merged sources** (replace `CUSTOMER_ID` and dates):

```bash
curl -H "Authorization: Bearer apex_mcp_YOUR_KEY" \
  "https://apex.searchmind.tech/api/mcp/merged-sources?customerId=CUSTOMER_ID&startDate=2025-06-01&endDate=2025-06-30"
```

## 4. Connect Claude Code or Cursor

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

## 5. Example prompts

| Goal | Prompt |
|------|--------|
| Connectivity | “Use the apex ping tool” |
| Customers | “List all APEX customers using list_customers” |
| Performance data | “Use get_merged_sources for customer `{id}` from 2025-06-01 to 2025-06-30” |

## 6. Revoke a key

Admin → MCP API Keys → **Revoke**. The key stops working immediately.

## Local development

**APEX** (main repo):

```bash
npm run dev
```

**MCP server:**

```bash
cd mcp-server-apex
npm install
APEX_API_URL=http://localhost:3000 npm start
```

Generate a key against local APEX, then point your MCP client at `http://localhost:3000/mcp` with the Bearer header.

See [Endpoints](./endpoints.md) for the full API reference.
