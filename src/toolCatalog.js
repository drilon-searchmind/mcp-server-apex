/** Extended MCP tool definitions (v0.6.0). */

export const MCP_EXTENDED_DATA_TOOLS = [
    { name: "get_meta_ad_performance", resource: "meta-ad-performance", title: "Get Meta ad performance", description: "Ad-level Meta/Facebook performance metrics.", needsDateRange: true },
    { name: "get_google_ad_performance", resource: "google-ad-performance", title: "Get Google ad performance", description: "Ad-level Google Ads performance metrics.", needsDateRange: true },
    { name: "get_google_ppc_dashboard", resource: "google-ppc-dashboard", title: "Get Google PPC dashboard", description: "Full Google PPC dashboard payload.", needsDateRange: true },
    { name: "get_klaviyo_dashboard", resource: "klaviyo-dashboard", title: "Get Klaviyo dashboard", description: "Full Klaviyo EM dashboard with optional comparison period.", needsDateRange: true, extraParams: ["prevStartDate", "prevEndDate"] },
    { name: "get_pinterest_dashboard", resource: "pinterest-dashboard", title: "Get Pinterest dashboard", description: "Full Pinterest dashboard payload.", needsDateRange: true },
    { name: "get_snapchat_dashboard", resource: "snapchat-dashboard", title: "Get Snapchat dashboard", description: "Full Snapchat dashboard payload.", needsDateRange: true },
    { name: "get_reddit_dashboard", resource: "reddit-dashboard", title: "Get Reddit dashboard", description: "Full Reddit dashboard payload.", needsDateRange: true },
    { name: "get_bing_dashboard", resource: "bing-dashboard", title: "Get Bing dashboard", description: "Full Microsoft/Bing ads dashboard payload.", needsDateRange: true },
    { name: "get_seo_brand_keywords", resource: "seo-brand-keywords", title: "Get SEO brand keywords", description: "Brand keyword list configured for SEO.", needsDateRange: false },
    { name: "get_seo_exact_keywords", resource: "seo-exact-keywords", title: "Get SEO exact keywords", description: "Exact-match SEO keyword groups.", needsDateRange: false },
    { name: "get_seo_partial_keywords", resource: "seo-partial-keywords", title: "Get SEO partial keywords", description: "Partial-match SEO keyword groups.", needsDateRange: false },
    { name: "get_seo_insights", resource: "seo-insights", title: "Get SEO insights", description: "Full SEO insights bundle from Search Console.", needsDateRange: true, extraParams: ["compareStartDate", "compareEndDate", "siteUrl"] },
];

export const MCP_EXTENDED_CUSTOMER_RESOURCE_TOOLS = [
    { name: "get_share_of_search", resource: "share-of-search", title: "Get share of search", description: "Saved share-of-search snapshots for a customer.", needsDateRange: false },
    { name: "get_data_wrapped", resource: "data-wrapped", title: "Get Data Wrapped", description: "Monthly Data Wrapped summary for a customer.", needsDateRange: false, extraParams: ["period"] },
    { name: "list_data_wrapped_reports", resource: "data-wrapped-reports", title: "List Data Wrapped reports", description: "Saved Data Wrapped report records.", needsDateRange: false },
    { name: "get_shopify_markets", resource: "shopify-markets", title: "Get Shopify markets", description: "Shopify markets catalog for a customer.", needsDateRange: false },
    { name: "get_shopify_products", resource: "shopify-products", title: "Get Shopify products", description: "Shopify product metrics for a date range.", needsDateRange: true, extraParams: ["fast"] },
    { name: "get_segmentation_shopifyql", resource: "segmentation-shopifyql", title: "Get ShopifyQL segmentation", description: "Customer segmentation via ShopifyQL.", needsDateRange: true, extraParams: ["full", "shopifyMarkets", "adSpendExclude"] },
    { name: "get_dashboard_audit", resource: "dashboard-audit", title: "Get dashboard audit", description: "List or fetch dashboard channel audits.", needsDateRange: false, extraParams: ["auditId"] },
    { name: "list_ai_analysis", resource: "ai-analysis", title: "List AI analysis chats", description: "Active AI analysis chats for a customer.", needsDateRange: false, extraParams: ["dashboardType"] },
    { name: "get_ai_analysis_chat", resource: "ai-analysis-chat", title: "Get AI analysis chat", description: "Single AI analysis chat by id.", needsDateRange: false, extraParams: ["chatId"] },
    { name: "get_campaign_planner_workspace", resource: "campaign-planner-workspace", title: "Get campaign planner workspace", description: "Campaign planner v2 workspace state.", needsDateRange: false },
    { name: "list_campaign_planner_comments", resource: "campaign-planner-comments", title: "List campaign planner comments", description: "Comments on a campaign planner line item.", needsDateRange: false, extraParams: ["lineItemId"] },
    { name: "get_bing_webmaster_site_data", resource: "bing-webmaster-site-data", title: "Get Bing Webmaster site data", description: "Bing Webmaster traffic and crawl stats.", needsDateRange: false, extraParams: ["startDate", "endDate"] },
    { name: "get_bing_webmaster_ai_performance", resource: "bing-webmaster-ai-performance", title: "Get Bing Webmaster AI performance", description: "Bing Webmaster AI performance placeholder series.", needsDateRange: true },
    { name: "get_merged_sources_filtered", resource: "merged-sources-filtered", title: "Get merged sources (filtered)", description: "Merged sources with daily-overview market/ad-spend filters.", needsDateRange: true, extraParams: ["source", "shopifyMarkets", "adSpendExclude"] },
    { name: "get_apex_radar_customer_settings", resource: "apex-radar-customer-settings", title: "Get Apex Radar customer settings", description: "Read-only Apex Radar channel settings for a customer.", needsDateRange: false },
];

export const MCP_EXTENDED_GLOBAL_RESOURCE_TOOLS = [
    { name: "list_our_tools", resource: "our-tools", title: "List our tools", description: "Internal tools directory in APEX.", needsDateRange: false },
    { name: "get_parent_customer_detail", resource: "parent-customer-detail", title: "Get parent customer detail", description: "Parent customer group with linked children.", needsDateRange: false, extraParams: ["parentId"] },
    { name: "get_parent_aggregated_metrics", resource: "parent-customer-aggregated", title: "Get parent aggregated metrics", description: "Roll-up metrics for all children in a parent group.", needsDateRange: true, extraParams: ["parentId", "comparisonMethod", "compareStartDate", "compareEndDate"] },
    { name: "get_parent_customer_filters", resource: "parent-customer-filters", title: "Get parent customer filters", description: "Saved Google/Meta campaign filters for a parent group.", needsDateRange: false, extraParams: ["parentId"] },
    { name: "list_user_campaigns", resource: "user-campaigns", title: "List user campaigns", description: "Campaigns assigned to an internal user.", needsDateRange: false, extraParams: ["userId"] },
    { name: "list_apex_radar_assignments", resource: "apex-radar-assignments", title: "List Apex Radar assignments", description: "User assignments per customer for a channel.", needsDateRange: false, extraParams: ["channel"] },
    { name: "get_apex_radar_google_overview", resource: "apex-radar-google-overview", title: "Get Apex Radar Google overview", description: "Google Ads Apex Radar overview rows.", needsDateRange: true, extraParams: ["customerId"] },
    { name: "get_apex_radar_facebook_overview", resource: "apex-radar-facebook-overview", title: "Get Apex Radar Facebook overview", description: "Meta Apex Radar overview rows.", needsDateRange: true, extraParams: ["customerId"] },
    { name: "get_apex_radar_google_investigator", resource: "apex-radar-google-investigator", title: "Get Apex Radar Google PI", description: "Google performance investigator for one customer.", needsDateRange: false, extraParams: ["customerId", "funnelStartDate", "funnelEndDate", "currentYear"] },
    { name: "get_apex_radar_facebook_investigator", resource: "apex-radar-facebook-investigator", title: "Get Apex Radar Facebook PI", description: "Meta performance investigator for one customer.", needsDateRange: false, extraParams: ["customerId", "funnelStartDate", "funnelEndDate", "currentYear"] },
    { name: "get_bing_webmaster_status", resource: "bing-webmaster-status", title: "Get Bing Webmaster status", description: "Bing Webmaster integration configuration status.", needsDateRange: false },
    { name: "list_seo_properties", resource: "seo-list-properties", title: "List SEO properties", description: "Google Search Console properties accessible to APEX.", needsDateRange: false },
];
