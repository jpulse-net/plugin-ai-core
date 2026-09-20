/**
 * @name            jPulse Framework / Plugins / AI Core / WebApp / Agent / Cancel
 * @tagline         Turn cancellation flag and broadcast
 * @description     In-process flag plus RedisManager broadcast so any process can stop a turn
 * @file            plugins/ai-core/webapp/utils/agent/cancel.js
 * @version         1.0.13
 * @release         2026-09-19
 * @repository      https://github.com/jpulse-net/plugin-ai-core
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.20, Grok 4.6
 */

const CHANNEL = 'controller:ai-core:turn:cancel';
const flags = new Set();
const aborts = new Map();
let subscribed = false;

export function cancelChannel() {
    return CHANNEL;
}

/**
 * Let a later cancel abort an in-flight provider wait (SSE hang, fetch, …).
 * @param {string} threadId
 * @param {AbortController} controller
 */
export function attachTurnAbort(threadId, controller) {
    if (!threadId || !controller) {
        return;
    }
    aborts.set(String(threadId), controller);
}

/**
 * @param {string} threadId
 * @param {AbortController} [controller]
 */
export function detachTurnAbort(threadId, controller) {
    const key = String(threadId);
    const current = aborts.get(key);
    if (!controller || current === controller) {
        aborts.delete(key);
    }
}

export function requestCancel(threadId) {
    const key = String(threadId);
    flags.add(key);
    const controller = aborts.get(key);
    if (controller && !controller.signal.aborted) {
        controller.abort();
    }
}

export function clearCancel(threadId) {
    flags.delete(String(threadId));
}

export function isCancelRequested(threadId) {
    return flags.has(String(threadId));
}

export function clearAllCancels() {
    flags.clear();
    aborts.clear();
}

/**
 * Local flag plus a broadcast so another process can stop this turn.
 */
export async function broadcastCancel(threadId, deps = {}) {
    requestCancel(threadId);
    const redisManager = deps.redisManager || global.RedisManager;
    if (redisManager && typeof redisManager.publishBroadcast === 'function') {
        await redisManager.publishBroadcast(CHANNEL, { threadId: String(threadId) });
    }
}

export function subscribeCancelBroadcast(deps = {}) {
    if (subscribed) {
        return;
    }
    const redisManager = deps.redisManager || global.RedisManager;
    if (redisManager && typeof redisManager.registerBroadcastCallback === 'function') {
        redisManager.registerBroadcastCallback(CHANNEL, (data) => {
            if (data?.threadId) {
                requestCancel(data.threadId);
            }
        }, { omitSelf: true });
        subscribed = true;
    }
}

export function _resetSubscribeFlag() {
    subscribed = false;
}

// EOF plugins/ai-core/webapp/utils/agent/cancel.js
