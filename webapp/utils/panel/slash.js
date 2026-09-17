/**
 * @name            jPulse Framework / Plugins / AI Core / WebApp / Panel / Slash
 * @tagline         Local slash-command parser
 * @description     Five panel commands; none are sent to the model
 * @file            plugins/ai-core/webapp/utils/panel/slash.js
 * @version         1.0.2
 * @release         2026-09-17
 * @repository      https://github.com/jpulse-net/plugin-ai-core
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.20, Grok 4.6
 */

export const SLASH_COMMANDS = ['help', 'tools', 'model', 'new', 'cancel'];

/**
 * @param {string} text
 * @returns {{ kind: 'literal', text: string }|{ kind: 'command', name: string, arg: string }|null}
 */
export function parseSlashCommand(text) {
    const raw = String(text || '');
    if (raw.startsWith('//')) {
        return { kind: 'literal', text: raw.slice(1) };
    }
    const match = raw.match(/^\/([a-z]+)(?:\s+([\s\S]+))?$/i);
    if (!match) {
        return null;
    }
    const name = match[1].toLowerCase();
    if (!SLASH_COMMANDS.includes(name)) {
        return null;
    }
    return {
        kind: 'command',
        name,
        arg: (match[2] || '').trim()
    };
}

/**
 * Commands whose names start with the typed `/` prefix. Empty when the
 * input is not a slash draft (`//` is a literal, not a picker).
 * @param {string} text
 * @returns {string[]}
 */
export function filterSlashCommands(text) {
    const raw = String(text || '');
    if (!raw.startsWith('/') || raw.startsWith('//')) {
        return [];
    }
    const rest = raw.slice(1);
    const space = rest.search(/\s/);
    const typed = (space < 0 ? rest : rest.slice(0, space)).toLowerCase();
    return SLASH_COMMANDS.filter((name) => name.startsWith(typed));
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

// EOF plugins/ai-core/webapp/utils/panel/slash.js
