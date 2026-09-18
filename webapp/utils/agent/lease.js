/**
 * @name            jPulse Framework / Plugins / AI Core / WebApp / Agent / Lease
 * @tagline         Single-flight turn lease
 * @description     Redis SET PX NX when available; in-process map when it is not
 * @file            plugins/ai-core/webapp/utils/agent/lease.js
 * @version         1.0.6
 * @release         2026-09-17
 * @repository      https://github.com/jpulse-net/plugin-ai-core
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.20, Grok 4.6
 */

const localLeases = new Map();

function cachePath() {
    return 'plugin:ai-core:lease';
}

/**
 * @param {string} threadId
 * @param {string} holderId
 * @param {number} ttlMs
 * @param {object} [deps]
 * @returns {Promise<boolean>} true if this caller won the race
 */
export async function acquireLease(threadId, holderId, ttlMs, deps = {}) {
    const redisManager = deps.redisManager || global.RedisManager;
    const key = String(threadId);

    if (redisManager?.isRedisAvailable?.() && typeof redisManager.getClient === 'function') {
        const client = redisManager.getClient('cache');
        if (client && typeof client.set === 'function') {
            const cacheKey = redisManager.getKey
                ? redisManager.getKey('cache', `ai-core:lease:${key}`)
                : `jpulse:cache:plugin:ai-core:lease:${key}`;
            const reply = await client.set(cacheKey, holderId, 'PX', ttlMs, 'NX');
            return reply === 'OK';
        }
    }

    const now = Date.now();
    const existing = localLeases.get(key);
    if (existing && existing.expiresAt > now && existing.holderId !== holderId) {
        return false;
    }
    localLeases.set(key, { holderId, expiresAt: now + ttlMs });
    return true;
}

export async function releaseLease(threadId, holderId, deps = {}) {
    const redisManager = deps.redisManager || global.RedisManager;
    const key = String(threadId);

    if (redisManager?.isRedisAvailable?.() && typeof redisManager.getClient === 'function') {
        const client = redisManager.getClient('cache');
        const cacheKey = redisManager.getKey
            ? redisManager.getKey('cache', `ai-core:lease:${key}`)
            : `jpulse:cache:plugin:ai-core:lease:${key}`;
        if (client && typeof client.get === 'function') {
            const current = await client.get(cacheKey);
            if (current === holderId && typeof client.del === 'function') {
                await client.del(cacheKey);
            }
        }
    }

    const existing = localLeases.get(key);
    if (existing && existing.holderId === holderId) {
        localLeases.delete(key);
    }
}

export function clearLocalLeases() {
    localLeases.clear();
}

export function _cachePath() {
    return cachePath();
}

// EOF plugins/ai-core/webapp/utils/agent/lease.js
