/** @type {Map<string, Promise<void>>} */
const sessionTails = new Map();

/**
 * Run one MCP HTTP handler at a time per session so parallel tool calls
 * cannot cross JSON-RPC responses (customerId mix-ups under concurrency).
 *
 * @template T
 * @param {string} sessionId
 * @param {() => Promise<T>} fn
 * @returns {Promise<T>}
 */
export function runSerializedForSession(sessionId, fn) {
	const key = String(sessionId || "").trim();
	if (!key) {
		return fn();
	}

	const previous = sessionTails.get(key) ?? Promise.resolve();
	const run = previous.catch(() => {}).then(fn);

	sessionTails.set(
		key,
		run.then(
			() => undefined,
			() => undefined
		)
	);

	return run;
}

/**
 * @param {string} sessionId
 */
export function clearSessionRequestQueue(sessionId) {
	const key = String(sessionId || "").trim();
	if (key) {
		sessionTails.delete(key);
	}
}
