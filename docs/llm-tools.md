# LLM tools (OpenAI + Gemini)

Apex MCP can call **OpenAI** and **Google Gemini** from inside Claude (or any MCP client). Claude remains the main assistant; these tools let you delegate specific prompts to other models for split-testing, second opinions, or variant generation.

API keys live on the **Railway MCP server** (`OPENAI_API_KEY`, `GEMINI_API_KEY`). Users never paste keys into chat.

## Setup (Railway)

Add environment variables to the `mcp-server-apex` Railway service:

| Variable | Required for |
|----------|----------------|
| `OPENAI_API_KEY` | `openai_chat`, OpenAI rows in `llm_splittest` |
| `GEMINI_API_KEY` | `gemini_chat`, Gemini rows in `llm_splittest` |

Redeploy, then disconnect/reconnect the Claude MCP connector so the new tools appear.

## Tools

### `list_llm_models`

Returns configured providers, default models, and the curated model list.

### `openai_chat`

| Param | Description |
|-------|-------------|
| `prompt` | Single user message (or use `messages`) |
| `messages` | Multi-turn `{ role, content }[]` |
| `systemPrompt` | Optional system instruction |
| `model` | Default `gpt-4o-mini` |
| `temperature` | 0–2, default 0.7 |
| `maxTokens` | Optional cap |

### `gemini_chat`

Same shape as `openai_chat`. Default model: `gemini-2.5-flash`.

### `llm_splittest`

Runs the **same prompt** against multiple models **in parallel** and returns side-by-side results (text, latency, token usage, errors per variant).

Default variants if `variants` is omitted:

- OpenAI `gpt-4o-mini`
- Gemini `gemini-2.5-flash`

Custom example:

```json
{
  "prompt": "Write 3 Danish Meta ad headlines for a luxury stroller brand.",
  "systemPrompt": "Keep headlines under 40 characters.",
  "variants": [
    { "provider": "openai", "model": "gpt-4o", "label": "GPT-4o" },
    { "provider": "openai", "model": "gpt-4o-mini", "label": "GPT-4o mini" },
    { "provider": "gemini", "model": "gemini-2.5-flash", "label": "Gemini Flash" }
  ]
}
```

## Example Claude prompts

| Goal | Prompt |
|------|--------|
| Split-test copy | "Use llm_splittest to compare two headline variants for …" |
| OpenAI only | "Use openai_chat with gpt-4.1 to rewrite this email …" |
| Gemini only | "Use gemini_chat to summarize this SEO report …" |
| Check availability | "Call list_llm_models" |

## Limitations

- Does **not** replace Claude's underlying model in the connector UI.
- No streaming — full response returned as JSON in the tool result.
- Keys are shared org-wide on Railway (same as APEX server-side integrations).
- Rate limits and billing apply per OpenAI/Google account.

## Local development

```bash
cd mcp-server-apex
OPENAI_API_KEY=sk-… GEMINI_API_KEY=… APEX_API_URL=http://localhost:3000 npm start
```
