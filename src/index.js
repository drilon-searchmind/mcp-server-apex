import { randomUUID } from "node:crypto";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import express from "express";

import {
  authenticateMcpRequest,
  getApexApiUrl,
  parseBearerToken,
} from "./apexAuth.js";
import { registerApexTools, listMcpToolNames } from "./tools.js";
import { getLlmProviderStatus } from "./llmClient.js";
import { MCP_LLM_TOOL_NAMES, registerLlmTools } from "./llmTools.js";
import { getPublicBaseUrl, mountOAuthRoutes } from "./oauth.js";
import {
  clearSessionRequestQueue,
  runSerializedForSession,
} from "./sessionRequestQueue.js";

const PORT = Number(process.env.PORT) || 3000;

/** @type {Map<string, { transport: StreamableHTTPServerTransport, bearerToken: string }>} */
const sessions = new Map();

/**
 * @param {string} bearerToken
 */
function createServer(bearerToken) {
  const server = new McpServer(
    {
      name: "mcp-server-apex",
      version: "0.7.4",
    },
    {
      instructions:
        "Searchmind APEX MCP server (read-only analytics + optional LLM tools). Use list_customers to find customer ids, then fetch platform-specific data or get_merged_sources for combined metrics. For OpenAI/Gemini inside Claude, use openai_chat, gemini_chat, or llm_splittest (API keys are server-side).",
    }
  );

  registerApexTools(server, bearerToken);
  registerLlmTools(server);
  return server;
}

function authErrorResponse(res, err) {
  const status = err?.status || 500;
  const label =
    status === 401
      ? "Unauthorized"
      : status === 503
        ? "Service unavailable"
        : status === 502
          ? "Bad gateway"
          : "Internal server error";

  if (status === 401) {
    try {
      const base = getPublicBaseUrl();
      res.setHeader(
        "WWW-Authenticate",
        `Bearer realm="mcp", authorization_uri="${base}/oauth/authorize"`
      );
    } catch {
      /* MCP_PUBLIC_URL not set */
    }
  }

  return res.status(status).json({
    error: label,
    message: err?.message || label,
  });
}

function jsonRpcError(res, status, message, code = -32000) {
  return res.status(status).json({
    jsonrpc: "2.0",
    error: { code, message },
    id: null,
  });
}

/**
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 */
async function mcpAuthMiddleware(req, res, next) {
  try {
    req.mcpAuth = await authenticateMcpRequest(req);
    req.mcpBearerToken = parseBearerToken(req);
    if (!req.mcpBearerToken) {
      throw Object.assign(new Error("Missing Authorization Bearer token"), {
        status: 401,
      });
    }
    next();
  } catch (err) {
    return authErrorResponse(res, err);
  }
}

/**
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
async function handleMcpPost(req, res) {
  const sessionId = String(req.headers["mcp-session-id"] || "").trim();
  const bearerToken = req.mcpBearerToken;

  try {
    if (sessionId && sessions.has(sessionId)) {
      const session = sessions.get(sessionId);
      await runSerializedForSession(sessionId, () =>
        session.transport.handleRequest(req, res, req.body)
      );
      return;
    }

    if (!sessionId && isInitializeRequest(req.body)) {
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (id) => {
          sessions.set(id, { transport, bearerToken });
          console.error(`[mcp] session initialized: ${id}`);
        },
      });

      transport.onclose = () => {
        const id = transport.sessionId;
        if (id && sessions.has(id)) {
          sessions.delete(id);
          clearSessionRequestQueue(id);
          console.error(`[mcp] session closed: ${id}`);
        }
      };

      const server = createServer(bearerToken);
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
      return;
    }

    return jsonRpcError(
      res,
      400,
      "Bad Request: No valid session ID provided"
    );
  } catch (error) {
    console.error("[mcp] POST failed:", error);
    if (!res.headersSent) {
      jsonRpcError(res, 500, "Internal server error", -32603);
    }
  }
}

/**
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
async function handleMcpGet(req, res) {
  const sessionId = String(req.headers["mcp-session-id"] || "").trim();
  const session = sessionId ? sessions.get(sessionId) : null;

  if (!session) {
    return res.status(400).send("Invalid or missing session ID");
  }

  try {
    await runSerializedForSession(sessionId, () =>
      session.transport.handleRequest(req, res)
    );
  } catch (error) {
    console.error("[mcp] GET failed:", error);
    if (!res.headersSent) {
      res.status(500).send("Internal server error");
    }
  }
}

/**
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
async function handleMcpDelete(req, res) {
  const sessionId = String(req.headers["mcp-session-id"] || "").trim();
  const session = sessionId ? sessions.get(sessionId) : null;

  if (!session) {
    return res.status(400).send("Invalid or missing session ID");
  }

  try {
    await runSerializedForSession(sessionId, () =>
      session.transport.handleRequest(req, res)
    );
    sessions.delete(sessionId);
    clearSessionRequestQueue(sessionId);
  } catch (error) {
    console.error("[mcp] DELETE failed:", error);
    if (!res.headersSent) {
      res.status(500).send("Internal server error");
    }
  }
}

const app = express();

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Expose-Headers",
    "Mcp-Session-Id, WWW-Authenticate, Last-Event-Id, Mcp-Protocol-Version"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Authorization, Content-Type, Accept, Mcp-Session-Id, Last-Event-Id, Mcp-Protocol-Version"
  );
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

mountOAuthRoutes(app);

app.get("/", (_req, res) => {
  let apexConfigured = false;
  try {
    getApexApiUrl();
    apexConfigured = true;
  } catch {
    apexConfigured = false;
  }

  res.json({
    name: "mcp-server-apex",
    version: "0.7.3",
    status: "ok",
    mcpEndpoint: "/mcp",
    oauthDiscovery: "/.well-known/oauth-authorization-server",
    auth: "Google SSO OAuth or Bearer apex_mcp_… on /mcp",
    apexApiConfigured: apexConfigured,
    llmProviders: getLlmProviderStatus(),
    tools: [...listMcpToolNames(), ...MCP_LLM_TOOL_NAMES],
  });
});

app.get("/health", (_req, res) => {
  res.status(200).send("ok");
});

app.options("/mcp", (_req, res) => res.sendStatus(204));
app.post("/mcp", mcpAuthMiddleware, handleMcpPost);
app.get("/mcp", mcpAuthMiddleware, handleMcpGet);
app.delete("/mcp", mcpAuthMiddleware, handleMcpDelete);

app.listen(PORT, () => {
  console.error(`mcp-server-apex listening on port ${PORT}`);
  try {
    console.error(`APEX API: ${getApexApiUrl()}`);
  } catch {
    console.error("APEX_API_URL is not set — MCP auth will fail");
  }
  try {
    console.error(`MCP public URL: ${getPublicBaseUrl()}`);
  } catch {
    console.error("MCP_PUBLIC_URL is not set — OAuth will fail");
  }
});
