/** @typedef {"openai" | "gemini"} LlmProvider */

/** @typedef {{ role: "system" | "user" | "assistant", content: string }} ChatMessage */

/** @typedef {{ provider: LlmProvider, model: string, label?: string, latencyMs: number, text: string, usage?: Record<string, number>, error?: string }} SplittestResult */

export const OPENAI_MODELS = [
  { id: "gpt-4o-mini", label: "GPT-4o mini (fast, cheap)" },
  { id: "gpt-4o", label: "GPT-4o" },
  { id: "gpt-4.1-mini", label: "GPT-4.1 mini" },
  { id: "gpt-4.1", label: "GPT-4.1" },
  { id: "o3-mini", label: "o3-mini (reasoning)" },
];

export const GEMINI_MODELS = [
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash (default, fast)" },
  { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
  { id: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite (cheapest)" },
  { id: "gemini-flash-latest", label: "Gemini Flash (always latest)" },
  { id: "gemini-pro-latest", label: "Gemini Pro (always latest)" },
  { id: "gemini-3-flash-preview", label: "Gemini 3 Flash preview" },
];

/** Retired ids → current equivalents (Google removed 2.0/1.5 from the API). */
const GEMINI_MODEL_ALIASES = {
  "gemini-2.0-flash": "gemini-2.5-flash",
  "gemini-2.0-flash-001": "gemini-2.5-flash",
  "gemini-2.0-flash-lite": "gemini-2.5-flash-lite",
  "gemini-2.0-flash-lite-001": "gemini-2.5-flash-lite",
  "gemini-1.5-pro": "gemini-2.5-pro",
  "gemini-1.5-flash": "gemini-2.5-flash",
  "gemini-2.5-flash-preview-05-20": "gemini-2.5-flash",
};

/**
 * @param {string | undefined} model
 */
export function resolveGeminiModel(model) {
  const id = String(model || "gemini-2.5-flash").trim();
  return GEMINI_MODEL_ALIASES[id] || id;
}

export function getOpenAiApiKey() {
  return String(process.env.OPENAI_API_KEY || "").trim();
}

export function getGeminiApiKey() {
  return String(process.env.GEMINI_API_KEY || "").trim();
}

export function isOpenAiConfigured() {
  return Boolean(getOpenAiApiKey());
}

export function isGeminiConfigured() {
  return Boolean(getGeminiApiKey());
}

export function getLlmProviderStatus() {
  return {
    openai: {
      configured: isOpenAiConfigured(),
      defaultModel: "gpt-4o-mini",
      models: OPENAI_MODELS,
    },
    gemini: {
      configured: isGeminiConfigured(),
      defaultModel: "gemini-2.5-flash",
      models: GEMINI_MODELS,
    },
  };
}

/**
 * @param {{ prompt?: string, messages?: ChatMessage[], systemPrompt?: string }} input
 * @returns {ChatMessage[]}
 */
export function normalizeMessages(input) {
  const { prompt, messages, systemPrompt } = input || {};

  /** @type {ChatMessage[]} */
  const out = [];

  if (systemPrompt?.trim()) {
    out.push({ role: "system", content: systemPrompt.trim() });
  }

  if (Array.isArray(messages) && messages.length > 0) {
    for (const msg of messages) {
      if (!msg?.content?.trim()) continue;
      const role =
        msg.role === "assistant" || msg.role === "system" ? msg.role : "user";
      out.push({ role, content: msg.content.trim() });
    }
    return out;
  }

  if (prompt?.trim()) {
    out.push({ role: "user", content: prompt.trim() });
  }

  if (out.length === 0 || (out.length === 1 && out[0].role === "system")) {
    throw Object.assign(new Error("Provide prompt or messages"), { status: 400 });
  }

  return out;
}

/**
 * @param {ChatMessage[]} messages
 * @returns {{ system?: string, conversation: ChatMessage[] }}
 */
function splitSystemMessages(messages) {
  const systemParts = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content);
  const conversation = messages.filter((m) => m.role !== "system");
  return {
    system: systemParts.length ? systemParts.join("\n\n") : undefined,
    conversation,
  };
}

/**
 * @param {{ model?: string, messages: ChatMessage[], temperature?: number, maxTokens?: number }} opts
 */
export async function openaiChat(opts) {
  const apiKey = getOpenAiApiKey();
  if (!apiKey) {
    throw Object.assign(new Error("OPENAI_API_KEY is not configured on the MCP server"), {
      status: 503,
    });
  }

  const model = opts.model || "gpt-4o-mini";
  const started = Date.now();

  const body = {
    model,
    messages: opts.messages.map((m) => ({ role: m.role, content: m.content })),
    temperature: opts.temperature ?? 0.7,
  };

  if (opts.maxTokens != null) {
    body.max_tokens = opts.maxTokens;
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message =
      data?.error?.message || data?.message || `OpenAI API error ${res.status}`;
    throw Object.assign(new Error(message), { status: res.status, data });
  }

  const text = data?.choices?.[0]?.message?.content ?? "";
  const usage = data?.usage
    ? {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      }
    : undefined;

  return {
    provider: "openai",
    model,
    text,
    usage,
    latencyMs: Date.now() - started,
    finishReason: data?.choices?.[0]?.finish_reason ?? null,
  };
}

/**
 * @param {{ model?: string, messages: ChatMessage[], temperature?: number, maxTokens?: number }} opts
 */
export async function geminiChat(opts) {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw Object.assign(new Error("GEMINI_API_KEY is not configured on the MCP server"), {
      status: 503,
    });
  }

  const requestedModel = opts.model || "gemini-2.5-flash";
  const model = resolveGeminiModel(requestedModel);
  const started = Date.now();
  const { system, conversation } = splitSystemMessages(opts.messages);

  /** @type {Array<{ role: string, parts: Array<{ text: string }> }>} */
  const contents = [];

  for (const msg of conversation) {
    contents.push({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    });
  }

  /** @type {Record<string, unknown>} */
  const body = { contents };

  if (system) {
    body.systemInstruction = { parts: [{ text: system }] };
  }

  /** @type {Record<string, unknown>} */
  const generationConfig = {};
  if (opts.temperature != null) generationConfig.temperature = opts.temperature;
  if (opts.maxTokens != null) generationConfig.maxOutputTokens = opts.maxTokens;
  if (Object.keys(generationConfig).length) body.generationConfig = generationConfig;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "x-goog-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message =
      data?.error?.message || data?.message || `Gemini API error ${res.status}`;
    throw Object.assign(new Error(message), { status: res.status, data });
  }

  const text =
    data?.candidates?.[0]?.content?.parts
      ?.map((p) => p?.text)
      .filter(Boolean)
      .join("") ?? "";

  const usageMeta = data?.usageMetadata;
  const usage = usageMeta
    ? {
        promptTokens: usageMeta.promptTokenCount,
        completionTokens: usageMeta.candidatesTokenCount,
        totalTokens: usageMeta.totalTokenCount,
      }
    : undefined;

  return {
    provider: "gemini",
    model,
    requestedModel: requestedModel !== model ? requestedModel : undefined,
    text,
    usage,
    latencyMs: Date.now() - started,
    finishReason: data?.candidates?.[0]?.finishReason ?? null,
  };
}

/**
 * @param {LlmProvider} provider
 * @param {{ model?: string, messages: ChatMessage[], temperature?: number, maxTokens?: number }} opts
 */
export async function chatWithProvider(provider, opts) {
  if (provider === "openai") return openaiChat(opts);
  if (provider === "gemini") return geminiChat(opts);
  throw Object.assign(new Error(`Unknown provider: ${provider}`), { status: 400 });
}

/**
 * @param {{ prompt?: string, messages?: ChatMessage[], systemPrompt?: string, temperature?: number, maxTokens?: number, variants: Array<{ provider: LlmProvider, model?: string, label?: string }> }} opts
 * @returns {Promise<{ prompt: string, results: SplittestResult[] }>}
 */
export async function runSplittest(opts) {
  const messages = normalizeMessages(opts);
  const promptSummary =
    opts.prompt?.trim() ||
    messages.filter((m) => m.role === "user").at(-1)?.content ||
    "";

  const variants = opts.variants?.length
    ? opts.variants
    : [
        { provider: "openai", model: "gpt-4o-mini", label: "OpenAI GPT-4o mini" },
        { provider: "gemini", model: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
      ];

  const results = await Promise.all(
    variants.map(async (variant) => {
      const provider = variant.provider;
      const model =
        variant.model ||
        (provider === "openai" ? "gpt-4o-mini" : "gemini-2.5-flash");
      const label = variant.label || `${provider}/${model}`;
      const started = Date.now();

      try {
        const result = await chatWithProvider(provider, {
          model,
          messages,
          temperature: opts.temperature,
          maxTokens: opts.maxTokens,
        });

        return {
          provider,
          model,
          label,
          latencyMs: result.latencyMs ?? Date.now() - started,
          text: result.text,
          usage: result.usage,
        };
      } catch (error) {
        return {
          provider,
          model,
          label,
          latencyMs: Date.now() - started,
          text: "",
          error: error instanceof Error ? error.message : String(error),
        };
      }
    })
  );

  return { prompt: promptSummary, results };
}

/**
 * @param {string} toolName
 * @param {unknown} error
 */
export function llmToolErrorResult(toolName, error) {
  const err = /** @type {{ message?: string, status?: number, data?: unknown }} */ (error);
  const message = err?.message || String(error);

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            tool: toolName,
            ok: false,
            status: err?.status ?? null,
            error: message,
            details: err?.data ?? null,
          },
          null,
          2
        ),
      },
    ],
    isError: true,
  };
}
