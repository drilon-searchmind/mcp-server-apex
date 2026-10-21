import test from "node:test";
import assert from "node:assert/strict";

import { buildCallApexApiPostBody } from "../src/apexProxyBody.js";

test("buildCallApexApiPostBody forwards params as strings", () => {
    const body = buildCallApexApiPostBody({
        route: "/api/ga4-channels",
        customerId: "69c103c09739b05fae64adca",
        params: { startDate: "2026-09-01", endDate: "2026-09-30" },
    });
    assert.equal(body.route, "/api/ga4-channels");
    assert.equal(body.params.startDate, "2026-09-01");
    assert.equal(body.params.endDate, "2026-09-30");
});

test("buildCallApexApiPostBody merges query on route into params", () => {
    const body = buildCallApexApiPostBody({
        route: "/api/ga4-report?startDate=2026-09-01&endDate=2026-09-30",
        customerId: "x",
        params: { metrics: "sessions", dimensions: "date" },
    });
    assert.equal(body.params.startDate, "2026-09-01");
    assert.equal(body.params.endDate, "2026-09-30");
    assert.equal(body.params.metrics, "sessions");
});
