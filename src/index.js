import { randomUUID } from "node:crypto";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
import { z } from "zod";

import { authenticateMcpRequest, getApexApiUrl } from "./apexAuth.js";

const PORT = Number(process.env.PORT) || 3000;

function createServer() {
  const server = new McpServer(
    {
      name: "mcp-server-apex",
      version: "0.1.0",
    },
    {
      instructions:
        "Searchmind APEX MCP server (read-only). Requires a valid apex_mcp API key. Use ping to verify connectivity.",
    }
  );

  server.registerTool(
    "ping",
    {
      title: "Ping",
      description: "Returns a pong response to verify the server is reachable.",
      inputSchema: z.object({
        message: z.string().optional().describe("Optional message to echo back"),
      }),
    },
    async ({ message }) => {
      const text = message ? `pong: ${message}` : "pong";
      return {
        content: [{ type: "text", text }],
      };
    }
  );

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
    status: "ok",
    mcpEndpoint: "/mcp",
    auth: "Bearer apex_mcp_… required on POST /mcp",
    apexApiConfigured: apexConfigured,
  });
});

app.get("/health", (_req, res) => {
  res.status(200).send("ok");
});

app.post("/mcp", async (req, res) => {
  try {
    req.mcpAuth = await authenticateMcpRequest(req);
  } catch (err) {
    return authErrorResponse(res, err);
  }

  const server = createServer();

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
