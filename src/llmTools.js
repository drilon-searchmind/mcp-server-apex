import { z } from "zod";

import { jsonToolResult } from "./apexClient.js";
import {
  chatWithProvider,
  getLlmProviderStatus,
  llmToolErrorResult,
  normalizeMessages,
  runSplittest,
} from "./llmClient.js";

const chatMessageSchema = z.object({
  role: z
    .enum(["system", "user", "assistant"])
    .describe("Message role in the conversation"),
  content: z.string().describe("Message text"),
});

const chatInputSchema = z
  .object({
    prompt: z
      .string()
      .optional()
      .describe("Single user prompt (use messages for multi-turn instead)"),
    messages: z
      .array(chatMessageSchema)
      .optional()
      .describe("Multi-turn conversation history"),
    systemPrompt: z
      .string()
      .optional()
      .describe("Optional system instruction prepended to the request"),
    model: z.string().optional().describe("Model id — see list_llm_models"),
    temperature: z
      .number()
      .min(0)
      .max(2)
      .optional()
      .describe("Sampling temperature (default 0.7)"),
    maxTokens: z
      .number()
      .int()
      .positive()
      .optional()
      .describe("Max output tokens"),
  })
  .refine(
    (v) =>
      Boolean(v.prompt?.trim()) ||
      (Array.isArray(v.messages) && v.messages.length > 0),
    { message: "Provide prompt or messages" }
  );

export const MCP_LLM_TOOL_NAMES = [
  "list_llm_models",
  "openai_chat",
  "gemini_chat",
  "llm_splittest",
];

/**
 * @param {import("@modelcontextprotocol/sdk/server/mcp.js").McpServer} server
 */
export function registerLlmTools(server) {
  server.registerTool(
    "list_llm_models",
    {
      title: "List LLM models",
      description:
        "Lists OpenAI and Gemini models available via Apex MCP. Keys are configured server-side — users never paste API keys.",
      inputSchema: z.object({}),
    },
    async () => jsonToolResult(getLlmProviderStatus())
  );

  server.registerTool(
    "openai_chat",
    {
      title: "OpenAI chat",
      description:
        "Send a prompt to OpenAI (GPT-4o, GPT-4.1, o3-mini, etc.) through Apex MCP. Use for second opinions, copy variants, or analysis alongside Claude.",
      inputSchema: chatInputSchema,
    },
    async (args) => {
      try {
        const messages = normalizeMessages(args);
        const data = await chatWithProvider("openai", {
          model: args.model,
          messages,
          temperature: args.temperature,
          maxTokens: args.maxTokens,
        });
        return jsonToolResult(data);
      } catch (e) {
        return llmToolErrorResult("openai_chat", e);
      }
    }
  );

  server.registerTool(
    "gemini_chat",
    {
      title: "Gemini chat",
      description:
        "Send a prompt to Google Gemini through Apex MCP. Use for split-testing against OpenAI or Claude, or when Gemini fits the task better.",
      inputSchema: chatInputSchema,
    },
    async (args) => {
      try {
        const messages = normalizeMessages(args);
        const data = await chatWithProvider("gemini", {
          model: args.model,
          messages,
          temperature: args.temperature,
          maxTokens: args.maxTokens,
        });
        return jsonToolResult(data);
      } catch (e) {
        return llmToolErrorResult("gemini_chat", e);
      }
    }
  );

  server.registerTool(
    "llm_splittest",
    {
      title: "LLM split test",
      description:
        "Run the same prompt against multiple models/providers in parallel (default: GPT-4o mini vs Gemini 2.0 Flash). Ideal for A/B copy, tone, or reasoning comparisons inside Claude.",
      inputSchema: z
        .object({
          prompt: z
            .string()
            .optional()
            .describe("Prompt to send to every variant"),
          messages: z
            .array(chatMessageSchema)
            .optional()
            .describe("Alternative to prompt — same history sent to each variant"),
          systemPrompt: z.string().optional(),
          temperature: z.number().min(0).max(2).optional(),
          maxTokens: z.number().int().positive().optional(),
          variants: z
            .array(
              z.object({
                provider: z.enum(["openai", "gemini"]),
                model: z.string().optional(),
                label: z.string().optional().describe("Display label in results"),
              })
            )
            .optional()
            .describe(
              "Models to compare. Default: openai/gpt-4o-mini and gemini/gemini-2.0-flash"
            ),
        })
        .refine(
          (v) =>
            Boolean(v.prompt?.trim()) ||
            (Array.isArray(v.messages) && v.messages.length > 0),
          { message: "Provide prompt or messages" }
        ),
    },
    async (args) => {
      try {
        const data = await runSplittest(args);
        return jsonToolResult(data);
      } catch (e) {
        return llmToolErrorResult("llm_splittest", e);
      }
    }
  );
}
