import { z } from "zod";

import { apexGet, jsonToolResult } from "./apexClient.js";

const dateRangeSchema = {
    customerId: z.string().describe("APEX customer MongoDB id"),
    startDate: z.string().describe("Start date YYYY-MM-DD (inclusive)"),
    endDate: z.string().describe("End date YYYY-MM-DD (inclusive, max 366 day range)"),
};

/** @type {Array<{ name: string, title: string, description: string, path: string, params?: Record<string, z.ZodTypeAny> }>} */
export const MCP_DATA_TOOLS = [
    {
        name: "get_facebook_ads",
        title: "Get Facebook/Meta ads",
        description:
            "Meta/Facebook PPC dashboard metrics (daily spend, campaigns) for a customer and date range.",
        path: "/api/mcp/data/facebook",
    },
    {
        name: "get_google_ads",
        title: "Get Google Ads",
        description:
            "Google Ads PPC dashboard metrics for a customer and date range.",
        path: "/api/mcp/data/google-ads",
    },
    {
        name: "get_pinterest_ads",
        title: "Get Pinterest ads",
        description: "Pinterest ad metrics for a customer and date range.",
        path: "/api/mcp/data/pinterest",
    },
    {
        name: "get_snapchat_ads",
        title: "Get Snapchat ads",
        description: "Snapchat ad metrics for a customer and date range.",
        path: "/api/mcp/data/snapchat",
    },
    {
        name: "get_reddit_ads",
        title: "Get Reddit ads",
        description: "Reddit ad metrics for a customer and date range.",
        path: "/api/mcp/data/reddit",
    },
    {
        name: "get_bing_ads",
        title: "Get Microsoft/Bing ads",
        description: "Microsoft Advertising metrics for a customer and date range.",
        path: "/api/mcp/data/bing",
    },
    {
        name: "get_klaviyo_metrics",
        title: "Get Klaviyo metrics",
        description: "Klaviyo email marketing metrics for a customer and date range.",
        path: "/api/mcp/data/klaviyo",
    },
    {
        name: "get_store_revenue",
        title: "Get store revenue",
        description:
            "E-commerce store revenue only (Shopify/WooCommerce/Magento/DanDomain) without ad spend.",
        path: "/api/mcp/data/store",
    },
    {
        name: "get_ga4_metrics",
        title: "Get GA4 metrics",
        description: "Google Analytics 4 sessions and users by day for a customer.",
        path: "/api/mcp/data/ga4",
    },
    {
        name: "get_seo_metrics",
        title: "Get SEO metrics",
        description: "Google Search Console clicks/impressions by day and top keywords.",
        path: "/api/mcp/data/seo",
    },
    {
        name: "list_meta_campaigns",
        title: "List Meta campaigns",
        description: "List Meta/Facebook campaigns for a customer and date range.",
        path: "/api/mcp/data/meta-campaigns",
    },
    {
        name: "list_google_campaigns",
        title: "List Google campaigns",
        description: "List Google Ads campaigns for a customer and date range.",
        path: "/api/mcp/data/google-campaigns",
    },
];

/** @type {Array<{ name: string, title: string, description: string, resource: string, needsDateRange?: boolean }>} */
export const MCP_CUSTOMER_RESOURCE_TOOLS = [
    {
        name: "get_clickup_team",
        title: "Get ClickUp team",
        description:
            "ClickUp users assigned to a customer (PPC, PS, Meta, etc.) plus active service tags. Use after list_customers to resolve customer id from name.",
        resource: "clickup-team",
    },
    {
        name: "get_custom_kpis",
        title: "Get custom KPIs",
        description: "Custom KPI definitions configured for a customer.",
        resource: "custom-kpis",
    },
    {
        name: "get_campaigns",
        title: "Get campaigns",
        description: "Campaign records linked to a customer in APEX.",
        resource: "campaigns",
    },
    {
        name: "get_tracking_scores",
        title: "Get tracking scores",
        description: "Latest tracking/performance/compliance scan scores for a customer.",
        resource: "tracking-scores",
    },
    {
        name: "get_customer_segmentation",
        title: "Get customer segmentation",
        description: "Customer segmentation metrics derived from merged revenue and ad spend.",
        resource: "segmentation",
        needsDateRange: true,
    },
    {
        name: "get_markets_overview",
        title: "Get Shopify markets overview",
        description: "Shopify markets overview rows for customers with markets enabled.",
        resource: "markets-overview",
        needsDateRange: true,
    },
];

/** @type {Array<{ name: string, title: string, description: string, resource: string }>} */
export const MCP_GLOBAL_RESOURCE_TOOLS = [
    {
        name: "list_internal_users",
        title: "List internal users",
        description:
            "All internal APEX users with name, email, and ClickUp id (for matching team members).",
        resource: "internal-users",
    },
    {
        name: "list_parent_customers",
        title: "List parent customers",
        description: "Parent customer groups and their linked child customers.",
        resource: "parent-customers",
    },
];

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
            return { content: [{ type: "text", text }] };
        }
    );

    server.registerTool(
        "list_customers",
        {
            title: "List customers",
            description:
                "List all APEX customers with id, name, platform type, clickupTaskId, and which integrations are configured (no secrets).",
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
        "list_mcp_resources",
        {
            title: "List MCP resources",
            description:
                "Catalog of all read-only APEX MCP endpoints: metrics sources, customer resources, and global resources.",
            inputSchema: z.object({}),
        },
        async () => {
            try {
                const data = await apexGet(bearerToken, "/api/mcp/resources");
                return jsonToolResult(data);
            } catch (e) {
                return {
                    content: [
                        { type: "text", text: `list_mcp_resources failed: ${e.message}` },
                    ],
                    isError: true,
                };
            }
        }
    );

    server.registerTool(
        "get_customer",
        {
            title: "Get customer detail",
            description:
                "Full sanitized customer record: settings, static expenses, objectives, apex radar, cached customerTeam. API keys/passwords/tokens are stripped.",
            inputSchema: z.object({
                customerId: z.string().describe("APEX customer MongoDB id"),
            }),
        },
        async ({ customerId }) => {
            try {
                const data = await apexGet(
                    bearerToken,
                    `/api/mcp/customers/${encodeURIComponent(customerId)}`
                );
                return jsonToolResult(data);
            } catch (e) {
                return {
                    content: [{ type: "text", text: `get_customer failed: ${e.message}` }],
                    isError: true,
                };
            }
        }
    );

    server.registerTool(
        "list_data_sources",
        {
            title: "List data sources",
            description:
                "List all granular read-only APEX data sources available via MCP (facebook, google-ads, store, etc.).",
            inputSchema: z.object({}),
        },
        async () => {
            try {
                const data = await apexGet(bearerToken, "/api/mcp/data");
                return jsonToolResult(data);
            } catch (e) {
                return {
                    content: [{ type: "text", text: `list_data_sources failed: ${e.message}` }],
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
                "Fetch read-only daily merged revenue and ad spend for all platforms combined. Max 366 days.",
            inputSchema: z.object(dateRangeSchema),
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

    for (const tool of MCP_DATA_TOOLS) {
        server.registerTool(
            tool.name,
            {
                title: tool.title,
                description: tool.description,
                inputSchema: z.object(dateRangeSchema),
            },
            async ({ customerId, startDate, endDate }) => {
                try {
                    const data = await apexGet(bearerToken, tool.path, {
                        customerId,
                        startDate,
                        endDate,
                    });
                    return jsonToolResult(data);
                } catch (e) {
                    return {
                        content: [
                            { type: "text", text: `${tool.name} failed: ${e.message}` },
                        ],
                        isError: true,
                    };
                }
            }
        );
    }

    for (const tool of MCP_CUSTOMER_RESOURCE_TOOLS) {
        const inputSchema = tool.needsDateRange
            ? z.object(dateRangeSchema)
            : z.object({
                  customerId: z.string().describe("APEX customer MongoDB id"),
              });

        server.registerTool(
            tool.name,
            {
                title: tool.title,
                description: tool.description,
                inputSchema,
            },
            async (args) => {
                try {
                    const path = `/api/mcp/customers/${encodeURIComponent(args.customerId)}/resources/${tool.resource}`;
                    const query = tool.needsDateRange
                        ? { startDate: args.startDate, endDate: args.endDate }
                        : {};
                    const data = await apexGet(bearerToken, path, query);
                    return jsonToolResult(data);
                } catch (e) {
                    return {
                        content: [
                            { type: "text", text: `${tool.name} failed: ${e.message}` },
                        ],
                        isError: true,
                    };
                }
            }
        );
    }

    for (const tool of MCP_GLOBAL_RESOURCE_TOOLS) {
        server.registerTool(
            tool.name,
            {
                title: tool.title,
                description: tool.description,
                inputSchema: z.object({}),
            },
            async () => {
                try {
                    const data = await apexGet(
                        bearerToken,
                        `/api/mcp/global/${tool.resource}`
                    );
                    return jsonToolResult(data);
                } catch (e) {
                    return {
                        content: [
                            { type: "text", text: `${tool.name} failed: ${e.message}` },
                        ],
                        isError: true,
                    };
                }
            }
        );
    }
}

export function listMcpToolNames() {
    return [
        "ping",
        "list_customers",
        "list_mcp_resources",
        "get_customer",
        "list_data_sources",
        "get_merged_sources",
        ...MCP_DATA_TOOLS.map((t) => t.name),
        ...MCP_CUSTOMER_RESOURCE_TOOLS.map((t) => t.name),
        ...MCP_GLOBAL_RESOURCE_TOOLS.map((t) => t.name),
    ];
}
