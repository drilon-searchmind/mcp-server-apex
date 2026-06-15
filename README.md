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
| `OPENAI_API_KEY` | *(optional)* Enables `openai_chat` and OpenAI variants in `llm_splittest` |
| `GEMINI_API_KEY` | *(optional)* Enables `gemini_chat` and Gemini variants in `llm_splittest` |

## LLM tools (OpenAI + Gemini in Claude)

Claude stays the orchestrator, but Apex MCP can call **OpenAI** and **Gemini** server-side so staff can split-test copy, get second opinions, or compare model outputs without leaving Claude.

| Tool | Purpose |
|------|---------|
| `list_llm_models` | Which providers are configured + model ids |
| `openai_chat` | Single OpenAI completion |
| `gemini_chat` | Single Gemini completion |
| `llm_splittest` | Same prompt → multiple models in parallel |

Example prompt in Claude: *"Run llm_splittest on this ad headline for Pompdelux: … compare GPT-4o mini vs Gemini 2.0 Flash"*

See [docs/llm-tools.md](./docs/llm-tools.md).

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
