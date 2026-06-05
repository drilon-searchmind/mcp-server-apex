# mcp-server-apex

MCP server for Searchmind APEX, deployed as a remote Streamable HTTP service.

## Local development

```bash
npm install
npm start
```

Health check: `http://localhost:3000/health`  
MCP endpoint: `http://localhost:3000/mcp`

## Railway

Railway auto-detects this as a Node.js app via `package.json` and runs `npm start`.

Set any required environment variables in the Railway dashboard before deploying.

## Connect from Cursor

Add to your MCP config:

```json
{
  "mcpServers": {
    "apex": {
      "url": "https://YOUR-RAILWAY-URL.up.railway.app/mcp"
    }
  }
}
```
