/**
 * @name            jPulse Framework / Plugins / AI Core / WebApp / Panel / Slash
 * @tagline         Panel slash-command catalog
 * @description     One catalog for the picker, parser, aliases, and /help
 * @file            plugins/ai-core/webapp/utils/panel/slash.js
 * @version         1.0.11
 * @release         2026-09-19
 * @repository      https://github.com/jpulse-net/plugin-ai-core
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.20, Grok 4.6
 */

function whenQuota(ctx) {
    const rows = ctx && ctx.capability && ctx.capability.quota && ctx.capability.quota.rows;
    return Array.isArray(rows) && rows.length > 0;
}

function whenSources(ctx) {
    const cap = ctx && ctx.capability;
    if (!cap) {
        return false;
    }
    return cap.sourcesEnabled !== false || cap.imagesEnabled !== false;
}

function whenContext(ctx) {
    return !!(ctx && ctx.adapter && typeof ctx.adapter.contextOptions === 'function');
}

export const DEFAULT_COMMANDS = [
    { name: 'help' },
    { name: 'tools' },
    { name: 'model' },
    { name: 'new', aliases: ['clear'] },
    { name: 'cancel' },
    { name: 'conversations', aliases: ['resume'] },
    { name: 'quota', when: whenQuota },
    { name: 'sources', when: whenSources },
    { name: 'status' },
    { name: 'context', when: whenContext }
];

export const defaults = DEFAULT_COMMANDS.map((row) => row.name);

function builtinMap(builtins) {
    const map = new Map();
    (builtins || DEFAULT_COMMANDS).forEach((row) => {
        if (row && row.name) {
            map.set(String(row.name).toLowerCase(), row);
        }
    });
    return map;
}

function normalizeName(value) {
    return String(value || '').trim().toLowerCase();
}

function isCommandName(name) {
    return /^[a-z]+$/.test(name);
}

function cloneCommand(row) {
    return {
        name: row.name,
        aliases: Array.isArray(row.aliases) ? row.aliases.map(normalizeName).filter(isCommandName) : [],
        hint: row.hint,
        when: typeof row.when === 'function' ? row.when : null,
        hidden: !!row.hidden,
        run: typeof row.run === 'function' ? row.run : null
    };
}

/**
 * @param {Array<string|object>|null|undefined} list
 * @param {object[]} [builtins]
 * @returns {object[]}
 */
export function normalizeCatalog(list, builtins) {
    const built = builtinMap(builtins);
    const names = list == null
        ? (builtins || DEFAULT_COMMANDS).map((row) => row.name)
        : list;
    const byName = new Map();
    (Array.isArray(names) ? names : []).forEach((entry) => {
        if (typeof entry === 'string') {
            const name = normalizeName(entry);
            if (!isCommandName(name)) {
                return;
            }
            const found = built.get(name);
            if (found) {
                byName.set(name, cloneCommand(found));
            }
            return;
        }
        if (!entry || typeof entry !== 'object' || !entry.name) {
            return;
        }
        const name = normalizeName(entry.name);
        if (!isCommandName(name)) {
            return;
        }
        const found = built.get(name);
        const merged = cloneCommand(found || { name: name });
        if (Array.isArray(entry.aliases)) {
            merged.aliases = entry.aliases.map(normalizeName).filter(isCommandName);
        }
        if (entry.hint != null) {
            merged.hint = entry.hint;
        }
        if (typeof entry.when === 'function') {
            merged.when = entry.when;
        }
        if (entry.hidden != null) {
            merged.hidden = !!entry.hidden;
        }
        if (typeof entry.run === 'function') {
            merged.run = entry.run;
        }
        merged.name = name;
        byName.set(name, merged);
    });
    return Array.from(byName.values());
}

function commandAvailable(cmd, ctx) {
    if (!cmd || typeof cmd.when !== 'function') {
        return true;
    }
    try {
        return cmd.when(ctx || {}) !== false;
    } catch (_err) {
        return false;
    }
}

function aliasesOf(cmd) {
    return Array.isArray(cmd && cmd.aliases) ? cmd.aliases : [];
}

function lookupCommand(catalog, token) {
    const name = normalizeName(token);
    for (let i = 0; i < catalog.length; i += 1) {
        const cmd = catalog[i];
        if (cmd.name === name || aliasesOf(cmd).indexOf(name) >= 0) {
            return cmd;
        }
    }
    return null;
}

function matchesPrefix(cmd, typed) {
    if (!typed) {
        return true;
    }
    if (cmd.name.indexOf(typed) === 0) {
        return true;
    }
    return aliasesOf(cmd).some((alias) => alias.indexOf(typed) === 0);
}

/**
 * @param {string} text
 * @param {object[]} [catalog]
 * @param {object} [ctx]
 * @returns {{ kind: 'literal', text: string }|{ kind: 'command', name: string, arg: string }|null}
 */
export function parseSlashCommand(text, catalog, ctx) {
    const raw = String(text || '');
    if (raw.startsWith('//')) {
        return { kind: 'literal', text: raw.slice(1) };
    }
    const match = raw.match(/^\/([a-z]+)(?:\s+([\s\S]+))?$/i);
    if (!match) {
        return null;
    }
    const list = Array.isArray(catalog) ? catalog : normalizeCatalog();
    const cmd = lookupCommand(list, match[1]);
    if (!cmd || !commandAvailable(cmd, ctx)) {
        return null;
    }
    return {
        kind: 'command',
        name: cmd.name,
        arg: (match[2] || '').trim()
    };
}

/**
 * Visible (not hidden, when() true) commands matching the typed `/` prefix.
 * @param {string} text
 * @param {object[]} [catalog]
 * @param {object} [ctx]
 * @returns {object[]}
 */
export function filterSlashCommands(text, catalog, ctx) {
    const raw = String(text || '');
    if (!raw.startsWith('/') || raw.startsWith('//')) {
        return [];
    }
    const rest = raw.slice(1);
    const space = rest.search(/\s/);
    const typed = (space < 0 ? rest : rest.slice(0, space)).toLowerCase();
    const list = Array.isArray(catalog) ? catalog : normalizeCatalog();
    return list.filter((cmd) => {
        if (cmd.hidden || !commandAvailable(cmd, ctx)) {
            return false;
        }
        return matchesPrefix(cmd, typed);
    });
}

/**
 * Find `[[label]]` anywhere in the row. Click inserts that label.
 * A trailing `(note)` is plain text, not a second syntax.
 * A single `[docs]` link is left as plain text.
 * @param {string} row
 * @returns {{ parts: Array<{ type: 'text'|'link', text: string, prompt: string }> }|null}
 */
export function parseExampleRow(row) {
    const raw = String(row == null ? '' : row);
    if (!raw.trim()) {
        return null;
    }
    const parts = [];
    const pattern = /\[\[([^\]]+)\]\]/g;
    let last = 0;
    let match = pattern.exec(raw);
    while (match) {
        if (match.index > last) {
            parts.push({ type: 'text', text: raw.slice(last, match.index) });
        }
        const label = match[1].trim();
        if (label) {
            parts.push({ type: 'link', text: label, prompt: label });
        }
        last = match.index + match[0].length;
        match = pattern.exec(raw);
    }
    if (last === 0) {
        return { parts: [{ type: 'text', text: raw }] };
    }
    if (last < raw.length) {
        parts.push({ type: 'text', text: raw.slice(last) });
    }
    return { parts };
}

export function parseModelArg(arg) {
    const text = String(arg || '').trim();
    if (!text) {
        return null;
    }
    const slash = text.indexOf('/');
    if (slash <= 0 || slash === text.length - 1) {
        return null;
    }
    return {
        provider: text.slice(0, slash),
        model: text.slice(slash + 1)
    };
}

export const SLASH_COMMANDS = defaults;

// EOF plugins/ai-core/webapp/utils/panel/slash.js
