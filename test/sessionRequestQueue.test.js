import test from "node:test";
import assert from "node:assert/strict";

import { runSerializedForSession, clearSessionRequestQueue } from "../src/sessionRequestQueue.js";

test("runSerializedForSession executes tasks in order", async () => {
	const sessionId = "test-session-order";
	clearSessionRequestQueue(sessionId);
	const order = [];

	await Promise.all([
		runSerializedForSession(sessionId, async () => {
			await new Promise((resolve) => setTimeout(resolve, 30));
			order.push("a");
		}),
		runSerializedForSession(sessionId, async () => {
			order.push("b");
		}),
		runSerializedForSession(sessionId, async () => {
			order.push("c");
		}),
	]);

	assert.deepEqual(order, ["a", "b", "c"]);
	clearSessionRequestQueue(sessionId);
});

test("runSerializedForSession isolates sessions", async () => {
	const a = "session-a";
	const b = "session-b";
	clearSessionRequestQueue(a);
	clearSessionRequestQueue(b);

	let aDone = false;
	const first = runSerializedForSession(a, async () => {
		await new Promise((resolve) => setTimeout(resolve, 20));
		aDone = true;
	});
	const second = runSerializedForSession(b, async () => {
		assert.equal(aDone, false);
	});

	await Promise.all([first, second]);
	clearSessionRequestQueue(a);
	clearSessionRequestQueue(b);
});
