/**
 * @name            jPulse Framework / Plugins / AI Core / WebApp / Tools / Actor
 * @tagline         Actor context and named capabilities
 * @description     Normalize who is acting and resolve named capabilities for a scope
 * @file            plugins/ai-core/webapp/utils/tools/actor.js
 * @version         1.0.6
 * @release         2026-09-17
 * @repository      https://github.com/jpulse-net/plugin-ai-core
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.20, Grok 4.6
 */

const ORIGINS = new Set(['web', 'ws', 'mcp', 'api']);

/**
 * @param {object} [raw]
 * @returns {object}
 */
export function normalizeActor(raw = {}) {
    const roles = Array.isArray(raw.roles) ? raw.roles.filter(r => typeof r === 'string') : [];
    const origin = ORIGINS.has(raw.origin) ? raw.origin : 'web';
    return {
        username: typeof raw.username === 'string' ? raw.username : '',
        roles,
        onBehalfOf: raw.onBehalfOf == null || raw.onBehalfOf === '' ? null : String(raw.onBehalfOf),
        origin,
        scopeType: typeof raw.scopeType === 'string' ? raw.scopeType : '',
        scopeId: raw.scopeId == null ? '' : String(raw.scopeId),
        req: raw.req == null ? null : raw.req
    };
}

/**
 * Build an actor from an Express request. `req` is kept for the minority of
 * tools that want request state; no gate reads it.
 * @param {object} req
 * @param {object} [extra]
 * @returns {object}
 */
export function actorFromRequest(req, extra = {}) {
    const user = req?.user || req?.session?.user || {};
    return normalizeActor({
        username: user.username || '',
        roles: user.roles || [],
        onBehalfOf: extra.onBehalfOf ?? user.onBehalfOf ?? null,
        origin: extra.origin || 'web',
        scopeType: extra.scopeType || '',
        scopeId: extra.scopeId || '',
        req
    });
}

/**
 * canRead / canWrite are sugar for scope:read / scope:write. Extra names on
 * scope.capabilities are granted as-is (TD-12).
 * @param {object} [scope]
 * @returns {Set<string>}
 */
export function capabilitiesFromScope(scope = {}) {
    const names = new Set();
    if (scope.canRead === true) {
        names.add('scope:read');
    }
    if (scope.canWrite === true) {
        names.add('scope:write');
    }
    const extra = scope.capabilities;
    if (Array.isArray(extra)) {
        for (const name of extra) {
            if (typeof name === 'string' && name) {
                names.add(name);
            }
        }
    } else if (extra && typeof extra === 'object') {
        for (const [name, granted] of Object.entries(extra)) {
            if (granted) {
                names.add(name);
            }
        }
    }
    return names;
}

/**
 * Suffix for every AI log line so onBehalfOf is never left to a call site.
 * @param {object} actor
 * @returns {string}
 */
export function onBehalfOfLogSuffix(actor) {
    if (!actor || !actor.onBehalfOf) {
        return '';
    }
    return ` onBehalfOf=${actor.onBehalfOf}`;
}

/**
 * Thread ownership follows onBehalfOf when present.
 * @param {object} actor
 * @returns {string}
 */
export function threadOwner(actor) {
    const normalized = normalizeActor(actor);
    return normalized.onBehalfOf || normalized.username;
}

// EOF plugins/ai-core/webapp/utils/tools/actor.js
