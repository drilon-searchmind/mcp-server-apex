/**
 * Build POST body for /api/mcp/proxy/apex (call_apex_api).
 * Merges query string on `route` into `params`; explicit params win.
 */

/**
 * @param {string} route
 * @returns {Record<string, string>}
 */
export function queryParamsFromRoute(route) {
    const raw = String(route || "").trim();
    if (!raw.includes("?")) return {};
    try {
        const url = new URL(raw.startsWith("/") ? raw : `/${raw}`, "http://apex.local");
        /** @type {Record<string, string>} */
        const out = {};
        for (const [key, value] of url.searchParams.entries()) {
            out[key] = value;
        }
        return out;
    } catch {
        return {};
    }
}

/**
 * @param {{ route: string, customerId: string, params?: Record<string, unknown> }} input
 */
export function buildCallApexApiPostBody(input) {
    const route = String(input.route || "").trim();
    const customerId = String(input.customerId || "").trim();
    const rawParams =
        input.params && typeof input.params === "object" && !Array.isArray(input.params)
            ? input.params
            : {};

    /** @type {Record<string, string>} */
    const params = {};
    for (const [key, value] of Object.entries({
        ...queryParamsFromRoute(route),
        ...rawParams,
    })) {
        if (value === undefined || value === null) continue;
        params[key] = String(value);
    }

    return { route, customerId, params };
}
