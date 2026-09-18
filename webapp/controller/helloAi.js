/**
 * @name            jPulse Framework / Plugins / AI Core / WebApp / Controller / Hello AI
 * @tagline         hello-ai demo hooks
 * @description     Scratch-pad tools, gated on scopeType hello-ai
 * @file            plugins/ai-core/webapp/controller/helloAi.js
 * @version         1.0.5
 * @release         2026-09-17
 * @repository      https://github.com/jpulse-net/plugin-ai-core
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.20, Grok 4.6
 */

const SCOPE_TYPE = 'hello-ai';
const schema = { type: 'object', properties: {} };

function isHelloScope(ctx) {
    return (ctx?.actor?.scopeType || ctx?.scopeType) === SCOPE_TYPE;
}

class HelloAiController {
    static hooks = {
        onAiScopeResolve: { handler: 'onAiScopeResolve' },
        onAiToolRegister: { handler: 'onAiToolRegister' },
        onAiToolExecute: { handler: 'onAiToolExecute' },
        onAiToolData: { handler: 'onAiToolData' },
        onAiPromptFragment: { handler: 'onAiPromptFragment' }
    };

    static async onAiScopeResolve(ctx) {
        if (!isHelloScope(ctx)) {
            return;
        }
        ctx.scope = {
            label: 'Hello AI scratch pad',
            canRead: true,
            canWrite: true,
            nouns: { item: 'text', container: 'scratch pad' }
        };
        return ctx;
    }

    static async onAiToolRegister(ctx) {
        if (!isHelloScope(ctx)) {
            return ctx;
        }
        ctx.tools.push(
            {
                name: 'read_draft',
                description: 'Read the scratch pad. data.text is the full text (capped at 32KB). data.excerpt is a 160-character preview.',
                schema,
                host: 'client',
                module: 'readDraft',
                requires: 'scope:read'
            },
            {
                name: 'propose_draft_rewrite',
                description: 'Propose a full replacement of the scratch pad. Creates an Apply card; does not write. Call more than once in the same turn for alternatives; each call is its own card.',
                schema: {
                    type: 'object',
                    properties: {
                        text: { type: 'string', description: 'The full replacement text' }
                    },
                    required: ['text']
                },
                host: 'client',
                module: 'proposeRewrite',
                requires: 'scope:write',
                proposes: true,
                dedupeArgs: true,
                budget: {
                    key: 'proposals',
                    max: 3,
                    overMessage: 'This turn already made %MAX% proposals.',
                    overHint: 'Apply what you already proposed, or reply.'
                }
            },
            {
                name: 'append_draft',
                description: 'Append text to the scratch pad. Writes immediately; this is not a proposal.',
                schema: {
                    type: 'object',
                    properties: {
                        text: { type: 'string', description: 'Text to append' }
                    },
                    required: ['text']
                },
                host: 'client',
                requires: 'scope:write',
                mutates: true,
                budget: {
                    key: 'writes',
                    max: 3,
                    overMessage: 'This turn already made %MAX% scratch-pad writes.',
                    overHint: 'Use what you already appended, or reply.'
                }
            },
            {
                name: 'get_hello_clock',
                description: 'Return the server time and the current username.',
                schema,
                host: 'server'
            }
        );
        return ctx;
    }

    static async onAiToolExecute(ctx) {
        if (ctx.tool?.name !== 'get_hello_clock') {
            return ctx;
        }
        ctx.result = {
            ok: true,
            data: {
                serverTime: new Date().toISOString(),
                username: ctx.actor?.username || ''
            },
            summary: 'get_hello_clock'
        };
        return ctx;
    }

    static async onAiToolData(ctx) {
        if (ctx.tool?.name !== 'read_draft' && ctx.tool?.module !== 'readDraft'
            && ctx.tool?.name !== 'propose_draft_rewrite' && ctx.tool?.module !== 'proposeRewrite') {
            return;
        }
        ctx.data = ctx.data || { text: '', selection: '' };
        return ctx;
    }

    static async onAiPromptFragment(ctx) {
        if (!isHelloScope(ctx)) {
            return ctx;
        }
        ctx.fragments.push(
            'You are helping the user with a scratch pad in their browser. '
            + 'Call it a scratch pad only — not a draft and not a summary. '
            + 'read_draft reads the scratch pad. append_draft writes immediately. '
            + 'propose_draft_rewrite proposes a full replacement and creates an Apply card; it does not write. '
            + 'You may call it more than once in the same turn for alternatives; each call is its own card and all of them stay applyable. '
            + 'Do not append a rewrite — propose it. get_hello_clock is a server-host tool. '
            + 'You have no outbound URL-fetch or filesystem tool. The user attaches files and already-fetched pages in the panel; those last only for this tab until reload. '
            + 'When they are present, read them with list_sources and get_source — a listed URL is ingested content, not a live link you open. '
            + 'When they are not, ask the user to attach them again; do not say you cannot read files or the web. '
            + 'If an image is attached and a vision model is selected, describe what it shows.'
        );
        return ctx;
    }
}

export { SCOPE_TYPE };
export default HelloAiController;

// EOF plugins/ai-core/webapp/controller/helloAi.js
