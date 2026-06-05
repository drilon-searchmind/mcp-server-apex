import { randomUUID } from "node:crypto";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";

import {
  authenticateMcpRequest,
  getApexApiUrl,
  parseBearerToken,
} from "./apexAuth.js";
import { registerApexTools } from "./tools.js";

const PORT = Number(process.env.PORT) || 3000;

/**
 * @param {string} bearerToken
 */
function createServer(bearerToken) {
  const server = new McpServer(
    {
      name: "mcp-server-apex",
      version: "0.2.0",
    },
    {
      instructions:
        "Searchmind APEX MCP server (read-only). Tools: ping, list_customers, get_merged_sources. Requires apex_mcp API key.",
    }
  );

  registerApexTools(server, bearerToken);
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

  return res.status(status).json({
    error: label,
    message: err?.message || label,
  });
}

const app = express();
app.use(express.json());

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
    version: "0.2.0",
    status: "ok",
    mcpEndpoint: "/mcp",
    auth: "Bearer apex_mcp_… required on POST /mcp",
    apexApiConfigured: apexConfigured,
    tools: ["ping", "list_customers", "get_merged_sources"],
  });
});

app.get("/health", (_req, res) => {
  res.status(200).send("ok");
});

app.post("/mcp", async (req, res) => {
  let bearerToken;
  try {
    req.mcpAuth = await authenticateMcpRequest(req);
    bearerToken = parseBearerToken(req);
    if (!bearerToken) {
      throw Object.assign(new Error("Missing Authorization Bearer token"), {
        status: 401,
      });
    }
  } catch (err) {
    return authErrorResponse(res, err);
  }

  const server = createServer(bearerToken);

  try {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);

    res.on("close", () => {
      transport.close();
      server.close();
    });
  } catch (error) {
    console.error("MCP request failed:", error);

    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: "Internal server error",
        },
        id: null,
      });
    }
  }
});

app.listen(PORT, () => {
  console.error(`mcp-server-apex listening on port ${PORT}`);
  try {
    console.error(`APEX API: ${getApexApiUrl()}`);
  } catch {
    console.error("APEX_API_URL is not set — MCP auth will fail");
  }
});
