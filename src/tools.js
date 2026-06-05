import { z } from "zod";

import { apexGet, jsonToolResult } from "./apexClient.js";

/**
 * @param {import("@modelcontextprotocol/sdk/server/mcp.js").McpServer} server
 * @param {string} bearerToken
 */
export function registerApexTools(server, bearerToken) {
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

  server.registerTool(
    "list_customers",
    {
      title: "List customers",
      description:
        "List all APEX customers with id, name, platform type, and which integrations are configured (no secrets).",
      inputSchema: z.object({
        includeArchived: z
          .boolean()
          .optional()
          .describe("Include archived customers (default false)"),
      }),
    },
    async ({ includeArchived }) => {
      try {
        const data = await apexGet(bearerToken, "/api/mcp/customers", {
          includeArchived: includeArchived ? "1" : undefined,
        });
        return jsonToolResult(data);
      } catch (e) {
        return {
          content: [{ type: "text", text: `list_customers failed: ${e.message}` }],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    "get_merged_sources",
    {
      title: "Get merged sources",
      description:
        "Fetch read-only daily merged revenue and ad spend for a customer and date range (YYYY-MM-DD). Max 366 days.",
      inputSchema: z.object({
        customerId: z
          .string()
          .describe("APEX customer MongoDB id"),
        startDate: z
          .string()
          .describe("Start date YYYY-MM-DD (inclusive)"),
        endDate: z
          .string()
          .describe("End date YYYY-MM-DD (inclusive)"),
      }),
    },
    async ({ customerId, startDate, endDate }) => {
      try {
        const data = await apexGet(bearerToken, "/api/mcp/merged-sources", {
          customerId,
          startDate,
          endDate,
        });
        return jsonToolResult(data);
      } catch (e) {
        return {
          content: [
            { type: "text", text: `get_merged_sources failed: ${e.message}` },
          ],
          isError: true,
        };
      }
    }
  );
}
