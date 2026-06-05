import { randomUUID } from "node:crypto";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
import { z } from "zod";

const PORT = Number(process.env.PORT) || 3000;

function createServer() {
  const server = new McpServer(
    {
      name: "mcp-server-apex",
      version: "0.1.0",
    },
    {
      instructions:
        "Searchmind APEX MCP server. Use ping to verify connectivity.",
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

const app = express();
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({
    name: "mcp-server-apex",
    status: "ok",
    mcpEndpoint: "/mcp",
  });
});

app.get("/health", (_req, res) => {
  res.status(200).send("ok");
});

app.post("/mcp", async (req, res) => {
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
});
