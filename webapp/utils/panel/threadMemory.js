/**
 * @name            jPulse Framework / Plugins / AI Core / WebApp / Panel / Thread Memory
 * @tagline         Per-user last-open thread in localStorage
 * @description     Scope the remembered thread id to the current user; ignore foreign ids
 * @file            plugins/ai-core/webapp/utils/panel/threadMemory.js
 * @version         1.0.15
 * @release         2026-09-21
 * @repository      https://github.com/jpulse-net/plugin-ai-core
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.20, Grok 4.6
 */

export function threadStorageKey(username, scopeType, scopeId) {
    const who = String(username || '').trim() || '_anon';
    return `jp:ai:thread:${who}:${scopeType}:${scopeId}`;
}

export function legacyThreadStorageKey(scopeType, scopeId) {
    return `jp:ai:thread:${scopeType}:${scopeId}`;
}

export function rememberedThreadId(userStored, legacyStored, threads) {
    const owned = new Set(
        (threads || [])
            .filter((thread) => thread && thread._id != null)
            .map((thread) => String(thread._id))
    );
    const userId = String(userStored || '');
    if (userId && owned.has(userId)) {
        return userId;
    }
    const legacyId = String(legacyStored || '');
    if (legacyId && owned.has(legacyId)) {
        return legacyId;
    }
    return '';
}

// EOF plugins/ai-core/webapp/utils/panel/threadMemory.js
