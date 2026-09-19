/*
 * @name            jPulse Framework / Plugins / AI Core / WebApp / View / jPulse Common JavaScript
 * @tagline         jPulse.ai client: panel, transport, tool modules
 * @description     Appended to the framework jpulse-common.js (W-098)
 * @file            plugins/ai-core/webapp/view/jpulse-common.js
 * @version         1.0.10
 * @release         2026-09-19
 * @repository      https://github.com/jpulse-net/plugin-ai-core
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.20, Grok 4.6
 */

if (!window.jPulse) {
    window.jPulse = {};
}

(function () {
    const I18N = {
        title: '{{i18n.view.ui.ai.panel.title}}',
        newConversation: '{{i18n.view.ui.ai.panel.newConversation}}',
        newConfirmTitle: '{{i18n.view.ui.ai.panel.newConfirmTitle}}',
        newConfirmBody: '{{i18n.view.ui.ai.panel.newConfirmBody}}',
        rename: '{{i18n.view.ui.ai.panel.rename}}',
        send: '{{i18n.view.ui.ai.panel.send}}',
        cancel: '{{i18n.view.ui.ai.panel.cancel}}',
        composePlaceholder: '{{i18n.view.ui.ai.panel.composePlaceholder}}',
        empty: '{{i18n.view.ui.ai.panel.empty}}',
        loadError: '{{i18n.view.ui.ai.panel.loadError}}',
        running: '{{i18n.view.ui.ai.panel.running}}',
        stuck: '{{i18n.view.ui.ai.panel.stuck}}',
        reconnecting: '{{i18n.view.ui.ai.panel.reconnecting}}',
        thinking: '{{i18n.view.ui.ai.panel.thinking}}',
        quota: '{{i18n.view.ui.ai.panel.quota}}',
        retention: '{{i18n.view.ui.ai.panel.retention}}',
        copy: '{{i18n.view.ui.ai.panel.copy}}',
        copied: '{{i18n.view.ui.ai.panel.copied}}',
        model: '{{i18n.view.ui.ai.panel.model}}',
        provider: '{{i18n.view.ui.ai.panel.provider}}',
        siteDefault: '{{i18n.view.ui.ai.panel.siteDefault}}',
        available: '{{i18n.view.ui.ai.panel.available}}',
        modelSet: '{{i18n.view.ui.ai.panel.modelSet}}',
        modelNotAllowed: '{{i18n.view.ui.ai.panel.modelNotAllowed}}',
        unnamed: '{{i18n.view.ui.ai.panel.unnamed}}',
        reloadModule: '{{i18n.view.ui.ai.panel.reloadModule}}',
        error: '{{i18n.view.ui.ai.panel.error}}',
        slashHelp: '{{i18n.view.ui.ai.slash.help}}',
        slashTools: '{{i18n.view.ui.ai.slash.tools}}',
        slashModel: '{{i18n.view.ui.ai.slash.model}}',
        slashNew: '{{i18n.view.ui.ai.slash.new}}',
        slashCancel: '{{i18n.view.ui.ai.slash.cancel}}',
        slashConversations: '{{i18n.view.ui.ai.slash.conversations}}',
        slashQuota: '{{i18n.view.ui.ai.slash.quota}}',
        slashSources: '{{i18n.view.ui.ai.slash.sources}}',
        slashStatus: '{{i18n.view.ui.ai.slash.status}}',
        slashContext: '{{i18n.view.ui.ai.slash.context}}',
        slashHost: '{{i18n.view.ui.ai.slash.host}}',
        slashWithheld: '{{i18n.view.ui.ai.slash.withheld}}',
        slashReason: '{{i18n.view.ui.ai.slash.reason}}',
        slashReasonReserved: '{{i18n.view.ui.ai.slash.reasonReserved}}',
        slashNone: '{{i18n.view.ui.ai.slash.none}}',
        slashUnknown: '{{i18n.view.ui.ai.slash.unknown}}',
        slashExamples: '{{i18n.view.ui.ai.slash.examples}}',
        slashCancelIdle: '{{i18n.view.ui.ai.slash.cancelIdle}}',
        slashConversationsNone: '{{i18n.view.ui.ai.slash.conversationsNone}}',
        slashConversationsOpened: '{{i18n.view.ui.ai.slash.conversationsOpened}}',
        slashConversationsBad: '{{i18n.view.ui.ai.slash.conversationsBad}}',
        slashQuotaNone: '{{i18n.view.ui.ai.slash.quotaNone}}',
        slashCostUnknown: '{{i18n.view.ui.ai.slash.costUnknown}}',
        slashSourcesNone: '{{i18n.view.ui.ai.slash.sourcesNone}}',
        slashSourcesCap: '{{i18n.view.ui.ai.slash.sourcesCap}}',
        slashStatusTransport: '{{i18n.view.ui.ai.slash.statusTransport}}',
        slashStatusThread: '{{i18n.view.ui.ai.slash.statusThread}}',
        slashStatusModel: '{{i18n.view.ui.ai.slash.statusModel}}',
        slashStatusChats: '{{i18n.view.ui.ai.slash.statusChats}}',
        slashStatusTurns: '{{i18n.view.ui.ai.slash.statusTurns}}',
        slashStatusRunning: '{{i18n.view.ui.ai.slash.statusRunning}}',
        slashStatusIdle: '{{i18n.view.ui.ai.slash.statusIdle}}',
        slashContextCurrent: '{{i18n.view.ui.ai.slash.contextCurrent}}',
        slashContextTarget: '{{i18n.view.ui.ai.slash.contextTarget}}',
        slashContextOptions: '{{i18n.view.ui.ai.slash.contextOptions}}',
        slashContextUnavailable: '{{i18n.view.ui.ai.slash.contextUnavailable}}',
        contextLabel: '{{i18n.view.ui.ai.panel.contextLabel}}',
        cardApply: '{{i18n.view.ui.ai.card.apply}}',
        cardUndo: '{{i18n.view.ui.ai.card.undo}}',
        cardApplyAll: '{{i18n.view.ui.ai.card.applyAll}}',
        cardApplied: '{{i18n.view.ui.ai.card.applied}}',
        cardUndone: '{{i18n.view.ui.ai.card.undone}}',
        cardFailed: '{{i18n.view.ui.ai.card.failed}}',
        cardGuard: '{{i18n.view.ui.ai.card.guard}}',
        cardRunning: '{{i18n.view.ui.ai.card.running}}',
        cardReadOnly: '{{i18n.view.ui.ai.card.readOnly}}',
        stripLifetime: '{{i18n.view.ui.ai.attach.stripLifetime}}',
        stripAttach: '{{i18n.view.ui.ai.attach.stripAttach}}',
        stripAdd: '{{i18n.view.ui.ai.attach.stripAdd}}',
        stripUrl: '{{i18n.view.ui.ai.attach.stripUrl}}',
        chipAttach: '{{i18n.view.ui.ai.attach.chipAttach}}',
        chipAttachBlocked: '{{i18n.view.ui.ai.attach.chipAttachBlocked}}',
        chipRemove: '{{i18n.view.ui.ai.attach.chipRemove}}',
        chipDetailName: '{{i18n.view.ui.ai.attach.chipDetailName}}',
        chipDetailUrl: '{{i18n.view.ui.ai.attach.chipDetailUrl}}',
        chipDetailType: '{{i18n.view.ui.ai.attach.chipDetailType}}',
        chipDetailChars: '{{i18n.view.ui.ai.attach.chipDetailChars}}',
        chipDetailSize: '{{i18n.view.ui.ai.attach.chipDetailSize}}',
        chipDetailOrigin: '{{i18n.view.ui.ai.attach.chipDetailOrigin}}',
        interceptTitle: '{{i18n.view.ui.ai.attach.interceptTitle}}',
        interceptFetch: '{{i18n.view.ui.ai.attach.interceptFetch}}',
        interceptSkip: '{{i18n.view.ui.ai.attach.interceptSkip}}',
        interceptCancel: '{{i18n.view.ui.ai.attach.interceptCancel}}',
        visionUnavailable: '{{i18n.view.ui.ai.attach.visionUnavailable}}',
        visionGated: '{{i18n.view.ui.ai.attach.visionGated}}',
        imagesUnavailable: '{{i18n.view.ui.ai.attach.imagesUnavailable}}',
        noConverter: '{{i18n.view.ui.ai.attach.noConverter}}',
        oversizeFile: '{{i18n.view.ui.ai.attach.oversizeFile}}',
        usedSources: '{{i18n.view.ui.ai.attach.usedSources}}'
    };
    const PANEL_TOOLS = { list_sources: true, get_source: true };
    const REGION_ANCHORS = ['header', 'transcriptTop', 'transcriptBottom', 'composeAbove', 'composeBelow'];
    const RESULT_SIZE_CAP = 256 * 1024;
    const loadedModules = new Map();
    let markedPromise = null;

    function compileClaimPhrases(list) {
        const lines = Array.isArray(list) ? list : String(list || '').split(/\n/);
        const compiled = [];
        lines.forEach((raw) => {
            const source = String(raw || '').trim();
            if (!source) {
                return;
            }
            const match = source.match(/^\/(.+)\/([a-z]*)$/i);
            if (match) {
                try {
                    const regex = new RegExp(match[1], match[2]);
                    compiled.push((text) => regex.test(text));
                    return;
                } catch (_err) {
                    // literal
                }
            }
            const needle = source.toLowerCase();
            compiled.push((text) => String(text || '').toLowerCase().indexOf(needle) !== -1);
        });
        return compiled;
    }

    function claimsWithoutCard(text, phrases) {
        if (!text) {
            return false;
        }
        return compileClaimPhrases(phrases).some((test) => test(text));
    }

    function escapeHtml(value) {
        return jPulse.string && jPulse.string.escapeHtml
            ? jPulse.string.escapeHtml(String(value == null ? '' : value))
            : String(value == null ? '' : value)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;');
    }

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

    const DEFAULT_COMMANDS = [
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
    const COMMAND_DEFAULTS = DEFAULT_COMMANDS.map((row) => row.name);

    function slashName(value) {
        return String(value || '').trim().toLowerCase();
    }

    function isCommandName(name) {
        return /^[a-z]+$/.test(name);
    }

    function cloneCommand(row) {
        return {
            name: row.name,
            aliases: Array.isArray(row.aliases) ? row.aliases.map(slashName).filter(isCommandName) : [],
            hint: row.hint,
            when: typeof row.when === 'function' ? row.when : null,
            hidden: !!row.hidden,
            run: typeof row.run === 'function' ? row.run : null
        };
    }

    function normalizeCatalog(list, builtins) {
        const source = builtins || DEFAULT_COMMANDS;
        const built = new Map();
        source.forEach((row) => {
            if (row && row.name) {
                built.set(slashName(row.name), row);
            }
        });
        const names = list == null ? source.map((row) => row.name) : list;
        const byName = new Map();
        (Array.isArray(names) ? names : []).forEach((entry) => {
            if (typeof entry === 'string') {
                const name = slashName(entry);
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
            const name = slashName(entry.name);
            if (!isCommandName(name)) {
                return;
            }
            const found = built.get(name);
            const merged = cloneCommand(found || { name: name });
            if (Array.isArray(entry.aliases)) {
                merged.aliases = entry.aliases.map(slashName).filter(isCommandName);
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

    function commandAliases(cmd) {
        return Array.isArray(cmd && cmd.aliases) ? cmd.aliases : [];
    }

    function lookupCommand(catalog, token) {
        const name = slashName(token);
        for (let i = 0; i < catalog.length; i += 1) {
            const cmd = catalog[i];
            if (cmd.name === name || commandAliases(cmd).indexOf(name) >= 0) {
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
        return commandAliases(cmd).some((alias) => alias.indexOf(typed) === 0);
    }

    function parseSlashCommand(text, catalog, ctx) {
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

    function filterSlashCommands(text, catalog, ctx) {
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

    function fillToken(template, token, value) {
        return String(template || '').split(token).join(String(value == null ? '' : value));
    }

    function parseExampleRow(row) {
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

    function unknownAnchorMessage(anchor) {
        return `Unknown region anchor "${anchor}". Valid anchors: ${REGION_ANCHORS.join(', ')}`;
    }

    function normalizeRegion(region) {
        if (!region || typeof region !== 'object' || !region.name) {
            throw new Error('A region needs a name');
        }
        const anchor = String(region.anchor || '');
        if (REGION_ANCHORS.indexOf(anchor) < 0) {
            throw new Error(unknownAnchorMessage(anchor));
        }
        const priority = Number(region.priority);
        return {
            name: String(region.name),
            anchor: anchor,
            priority: Number.isFinite(priority) ? priority : 100,
            render: typeof region.render === 'function' ? region.render : null,
            on: Array.isArray(region.on) ? region.on.slice() : []
        };
    }

    function mergeRegions(list) {
        const byName = new Map();
        (Array.isArray(list) ? list : []).forEach((row) => {
            const region = normalizeRegion(row);
            byName.set(region.name, region);
        });
        const ordered = Array.from(byName.values());
        ordered.sort((a, b) => {
            const ai = REGION_ANCHORS.indexOf(a.anchor);
            const bi = REGION_ANCHORS.indexOf(b.anchor);
            if (ai !== bi) {
                return ai - bi;
            }
            if (a.priority !== b.priority) {
                return a.priority - b.priority;
            }
            return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
        });
        return ordered;
    }

    function normalizeRegionContent(out) {
        if (out == null) {
            return { hide: true };
        }
        if (out && typeof out === 'object' && out.nodeType) {
            return { hide: false, node: out };
        }
        return { hide: false, text: String(out) };
    }

    function parseModelArg(arg) {
        const text = String(arg || '').trim();
        if (!text) {
            return null;
        }
        const slash = text.indexOf('/');
        if (slash <= 0 || slash === text.length - 1) {
            return null;
        }
        return { provider: text.slice(0, slash), model: text.slice(slash + 1) };
    }

    function ensureMarked() {
        if (window.marked) {
            return Promise.resolve(window.marked);
        }
        if (markedPromise) {
            return markedPromise;
        }
        markedPromise = new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = '/common/marked/marked.min.js';
            script.onload = () => resolve(window.marked || null);
            script.onerror = () => resolve(null);
            document.head.appendChild(script);
        });
        return markedPromise;
    }

    async function renderMarkdown(text) {
        const markedLib = await ensureMarked();
        if (!markedLib) {
            return `<pre class="plg-ai-plain">${escapeHtml(text)}</pre>`;
        }
        const html = markedLib.parse(String(text || ''));
        if (window.Prism && typeof window.Prism.highlightAllUnder === 'function') {
            const wrap = document.createElement('div');
            wrap.innerHTML = html;
            window.Prism.highlightAllUnder(wrap);
            return wrap.innerHTML;
        }
        return html;
    }

    function pinCopyButtons(root) {
        root.querySelectorAll('pre').forEach((pre) => {
            if (pre.querySelector('.plg-ai-copy')) {
                return;
            }
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'plg-ai-copy jp-btn jp-btn-sm';
            button.textContent = I18N.copy;
            button.addEventListener('click', async () => {
                const code = pre.querySelector('code');
                const text = code ? code.textContent : pre.textContent;
                try {
                    await navigator.clipboard.writeText(text || '');
                    button.textContent = I18N.copied;
                    setTimeout(() => {
                        button.textContent = I18N.copy;
                    }, 1200);
                } catch (_err) {
                    button.textContent = I18N.error;
                }
            });
            pre.classList.add('plg-ai-pre');
            pre.appendChild(button);
        });
    }

    async function loadToolModule(entry) {
        if (!entry || !entry.url || !entry.hash) {
            throw new Error(I18N.reloadModule);
        }
        const cached = loadedModules.get(entry.name);
        if (cached && cached.hash !== entry.hash) {
            throw new Error(I18N.reloadModule);
        }
        if (cached) {
            return cached.mod;
        }
        const mod = await import(entry.url);
        loadedModules.set(entry.name, { hash: entry.hash, mod: mod });
        return mod;
    }

    function emitAll(listeners, event) {
        listeners.slice().forEach((fn) => {
            try {
                fn(event);
            } catch (_err) {
                /* ignore listener errors */
            }
        });
    }

    function byteLength(value) {
        try {
            return new TextEncoder().encode(JSON.stringify(value)).length;
        } catch (_err) {
            return RESULT_SIZE_CAP + 1;
        }
    }

    function createTransport(options) {
        const listeners = [];
        let capability = null;
        let wsConn = null;
        const adapter = options.adapter || {};

        function on(fn) {
            listeners.push(fn);
            return () => {
                const idx = listeners.indexOf(fn);
                if (idx >= 0) {
                    listeners.splice(idx, 1);
                }
            };
        }

        async function probe(extra) {
            const query = new URLSearchParams({
                scopeType: options.scopeType || '',
                scopeId: options.scopeId || ''
            });
            if (extra && extra.hasSources) {
                query.set('hasSources', '1');
            }
            if (extra && extra.hasImages) {
                query.set('hasImages', '1');
            }
            if (extra && extra.threadId) {
                query.set('threadId', extra.threadId);
            }
            const res = await jPulse.api.get(`/api/1/ai/capability?${query.toString()}`);
            if (!res.success) {
                throw new Error(res.error || I18N.error);
            }
            capability = res.data;
            return capability;
        }

        function wirePayload(message) {
            if (message && message.success === true && message.data && typeof message.data === 'object') {
                return message.data;
            }
            return message;
        }

        async function handleToolCall(message, reply) {
            const data = (message && message.data) || {};
            let result;
            try {
                if (data.moduleHash) {
                    const entry = (capability && capability.modules || []).find((row) => {
                        return row.name === data.module || row.hash === data.moduleHash;
                    });
                    if (!entry || entry.hash !== data.moduleHash) {
                        result = {
                            ok: false,
                            code: 'AI_MODULE_STALE',
                            error: I18N.reloadModule,
                            hint: 'Reload the page.'
                        };
                    } else {
                        const mod = await loadToolModule(entry);
                        let toolData = null;
                        if (typeof options.toolDataFor === 'function') {
                            toolData = options.toolDataFor(data.name);
                        }
                        if (toolData == null && typeof adapter.toolData === 'function') {
                            toolData = await adapter.toolData(data.name);
                        }
                        result = await mod.run(toolData || {}, data.args || {});
                    }
                } else if (typeof adapter.executeTool === 'function') {
                    result = await adapter.executeTool(data.name, data.args || {});
                } else {
                    result = {
                        ok: false,
                        code: 'AI_MISSING_ADAPTER',
                        error: 'adapter.executeTool is missing.',
                        hint: 'Add executeTool to the panel adapter, or name a shared module.'
                    };
                }
            } catch (error) {
                result = {
                    ok: false,
                    code: 'AI_EXECUTE_FAILED',
                    error: error.message || I18N.error
                };
            }
            if (byteLength(result) > RESULT_SIZE_CAP) {
                reply({
                    success: false,
                    error: 'Tool result exceeded the size cap.',
                    code: 'AI_RESULT_TOO_LARGE'
                });
                return;
            }
            reply({ success: true, data: result });
        }

        function disconnectWs() {
            if (!wsConn) {
                return;
            }
            const previous = wsConn;
            wsConn = null;
            previous._aiIgnoreStatus = true;
            if (typeof previous.disconnect === 'function') {
                previous.disconnect();
            }
        }

        async function connectWs(threadId) {
            const path = `/api/1/ws/ai/${threadId}`;
            if (wsConn && wsConn.path === path) {
                return wsConn;
            }
            disconnectWs();
            const conn = jPulse.ws.connect(path);
            conn.path = path;
            wsConn = conn;
            conn.onMessage((message) => {
                const payload = wirePayload(message);
                if (payload && payload.type === 'tool_call') {
                    handleToolCall(payload, (replyPayload) => {
                        if (replyPayload.success === false) {
                            conn.replyError(message, replyPayload.error, replyPayload.code);
                            return;
                        }
                        conn.reply(message, replyPayload.data || replyPayload);
                    });
                    return;
                }
                if (payload && payload.type && payload.type !== 'connected') {
                    emitAll(listeners, payload);
                }
            });
            if (typeof conn.onStatusChange === 'function') {
                conn.onStatusChange((status) => {
                    if (conn._aiIgnoreStatus || conn !== wsConn) {
                        return;
                    }
                    if (status === 'connected') {
                        emitAll(listeners, { type: 'connected' });
                        return;
                    }
                    if (status === 'reconnecting' || status === 'disconnected') {
                        emitAll(listeners, { type: 'reconnecting' });
                    }
                });
            }
            if (conn.isConnected && conn.isConnected()) {
                emitAll(listeners, { type: 'connected' });
            }
            return conn;
        }

        async function startHttpTurn(threadId, body) {
            const response = await fetch(`/api/1/ai/thread/${encodeURIComponent(threadId)}/turn`, {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            if (!response.body) {
                emitAll(listeners, { type: 'error', message: I18N.error });
                return;
            }
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            while (true) {
                const chunk = await reader.read();
                if (chunk.done) {
                    break;
                }
                buffer += decoder.decode(chunk.value, { stream: true });
                const parts = buffer.split('\n\n');
                buffer = parts.pop() || '';
                parts.forEach((block) => {
                    const line = block.split('\n').find((row) => row.startsWith('data: '));
                    if (!line) {
                        return;
                    }
                    try {
                        emitAll(listeners, JSON.parse(line.slice(6)));
                    } catch (_err) {
                        /* ignore malformed SSE */
                    }
                });
            }
        }

        async function startTurn(threadId, body) {
            if (!capability) {
                await probe();
            }
            if (capability.transport === 'ws') {
                await connectWs(threadId);
                wsConn.send({ type: 'turn', data: body });
                return;
            }
            await startHttpTurn(threadId, body);
        }

        return {
            on: on,
            probe: probe,
            startTurn: startTurn,
            connectWs: connectWs,
            disconnect: disconnectWs,
            getCapability: () => capability
        };
    }

    function createPanel(options) {
        const scopeType = options.scopeType || '';
        const scopeId = String(options.scopeId || '');
        const adapter = options.adapter || {};
        const catalog = normalizeCatalog(options.commands);
        const siteRegions = mergeRegions(options.regions);
        const panelId = options.id || `ai-panel-${scopeType}-${scopeId}`;
        const title = (typeof options.title === 'string' && options.title.trim())
            ? options.title
            : I18N.title;
        const threadKey = `jp:ai:thread:${scopeType}:${scopeId}`;
        const panelStore = { sources: [], images: [], files: new Map(), caps: {} };
        const transport = createTransport({
            scopeType: scopeType,
            scopeId: scopeId,
            adapter: adapter,
            toolDataFor: function (name) {
                if (!PANEL_TOOLS[name]) {
                    return null;
                }
                return {
                    sources: panelStore.sources,
                    caps: panelStore.caps,
                    toolName: name
                };
            }
        });
        const root = document.createElement('div');
        root.className = 'plg-ai-panel';
        root.innerHTML = [
            '<div class="plg-ai-toolbar" data-jp-panel-drag>',
            `  <strong class="plg-ai-title">${escapeHtml(title)}</strong>`,
            `  <button type="button" class="plg-ai-close jp-float-panel-header-btn" data-jp-panel-close aria-label="×">×</button>`,
            '</div>',
            '<div class="plg-ai-thread-row">',
            `  <select class="plg-ai-thread-select jp-form-select" aria-label="${escapeHtml(title)}"></select>`,
            `  <input type="text" class="plg-ai-thread-edit jp-form-input" hidden aria-label="${escapeHtml(I18N.rename)}">`,
            `  <button type="button" class="plg-ai-rename jp-btn jp-btn-sm" title="${escapeHtml(I18N.rename)}" aria-label="${escapeHtml(I18N.rename)}">`,
            '    <svg class="plg-ai-icon" viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M11.6 1.6a1.2 1.2 0 0 1 1.7 0l1.1 1.1a1.2 1.2 0 0 1 0 1.7l-8.2 8.2L3 14l1.4-3.2 8.2-8.2z"/></svg>',
            '  </button>',
            `  <button type="button" class="plg-ai-new jp-btn jp-btn-sm" title="${escapeHtml(I18N.newConversation)}" aria-label="${escapeHtml(I18N.newConversation)}">`,
            '    <svg class="plg-ai-icon" viewBox="0 0 16 16" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" d="M8 3v10M3 8h10"/></svg>',
            '  </button>',
            '</div>',
            '<div class="plg-ai-anchor" data-anchor="header"></div>',
            '<div class="plg-ai-notice" hidden></div>',
            '<div class="plg-ai-anchor" data-anchor="transcriptTop"></div>',
            '<div class="plg-ai-messages"></div>',
            '<div class="plg-ai-anchor" data-anchor="transcriptBottom"></div>',
            '<div class="plg-ai-compose">',
            '  <div class="plg-ai-slash" hidden></div>',
            '  <div class="plg-ai-intercept" hidden></div>',
            '  <div class="plg-ai-anchor" data-anchor="composeAbove"></div>',
            `  <div class="plg-ai-context" hidden><label class="plg-ai-context-label">${escapeHtml(I18N.contextLabel)}</label><select class="plg-ai-context-select jp-form-select" aria-label="${escapeHtml(I18N.contextLabel)}"></select></div>`,
            '  <div class="plg-ai-strip" hidden>',
            '    <div class="plg-ai-strip-chips"></div>',
            '    <div class="plg-ai-strip-add">',
            `      <button type="button" class="plg-ai-add jp-btn jp-btn-sm jp-tooltip" data-tooltip="${escapeHtml(I18N.stripLifetime)}" aria-haspopup="menu" aria-expanded="false" aria-label="${escapeHtml(I18N.stripAttach)}">`,
            '        <svg class="plg-ai-icon" viewBox="0 0 16 16" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" d="M8 3v10M3 8h10"/></svg>',
            '      </button>',
            '      <div class="plg-ai-add-menu" hidden role="menu">',
            `        <button type="button" class="plg-ai-add-file" role="menuitem">${escapeHtml(I18N.stripAdd)}</button>`,
            `        <button type="button" class="plg-ai-add-url" role="menuitem">${escapeHtml(I18N.stripUrl)}</button>`,
            '      </div>',
            '    </div>',
            '  </div>',
            '  <div class="plg-ai-chip-pop" hidden></div>',
            '  <input type="file" class="plg-ai-file" hidden multiple>',
            '  <div class="plg-ai-compose-row">',
            `    <textarea class="plg-ai-input jp-form-textarea" rows="2" placeholder="${escapeHtml(I18N.composePlaceholder)}"></textarea>`,
            '    <div class="plg-ai-actions">',
            `      <button type="button" class="plg-ai-send jp-btn jp-btn-primary">${escapeHtml(I18N.send)}</button>`,
            `      <button type="button" class="plg-ai-cancel jp-btn" hidden>${escapeHtml(I18N.cancel)}</button>`,
            '    </div>',
            '  </div>',
            '  <div class="plg-ai-anchor" data-anchor="composeBelow"></div>',
            '</div>'
        ].join('');

        if (!root.parentNode && document.body) {
            document.body.appendChild(root);
        }
        let pinMessages = function () {};
        const handle = jPulse.UI.floatPanel.create({
            id: panelId,
            el: root,
            defaults: {
                w: 420,
                h: 560,
                open: !!options.open,
                ...(options.defaults || {})
            },
            minWidth: options.minWidth != null ? options.minWidth : 320,
            minHeight: options.minHeight != null ? options.minHeight : 360,
            launcher: options.launcher,
            storageKey: options.storageKey,
            cascade: options.cascade,
            group: options.group,
            mobile: options.mobile,
            onOpen: function () {
                pinMessages();
            }
        });
        const launcherEl = typeof options.launcher === 'string'
            ? document.querySelector(options.launcher)
            : options.launcher;
        function onLauncherClick() {
            if (typeof handle.toggle === 'function') {
                handle.toggle();
                return;
            }
            if (handle.isOpen && handle.isOpen()) {
                handle.close();
                return;
            }
            handle.open();
        }
        if (handle && launcherEl && typeof launcherEl.addEventListener === 'function') {
            launcherEl.addEventListener('click', onLauncherClick);
        }

        const state = {
            threads: [],
            threadId: localStorage.getItem(threadKey) || '',
            turns: [],
            locals: [],
            streaming: '',
            pendingUser: '',
            running: false,
            capability: null,
            selectedProvider: '',
            selectedModel: '',
            slashHighlight: 0,
            renaming: false,
            cardBusy: {},
            sources: [],
            images: [],
            intercept: null,
            openChip: '',
            contextValue: ''
        };

        const els = {
            messages: root.querySelector('.plg-ai-messages'),
            notice: root.querySelector('.plg-ai-notice'),
            slash: root.querySelector('.plg-ai-slash'),
            context: root.querySelector('.plg-ai-context'),
            contextSelect: root.querySelector('.plg-ai-context-select'),
            intercept: root.querySelector('.plg-ai-intercept'),
            strip: root.querySelector('.plg-ai-strip'),
            chips: root.querySelector('.plg-ai-strip-chips'),
            chipPop: root.querySelector('.plg-ai-chip-pop'),
            add: root.querySelector('.plg-ai-add'),
            addMenu: root.querySelector('.plg-ai-add-menu'),
            addFile: root.querySelector('.plg-ai-add-file'),
            addUrl: root.querySelector('.plg-ai-add-url'),
            file: root.querySelector('.plg-ai-file'),
            compose: root.querySelector('.plg-ai-compose'),
            input: root.querySelector('.plg-ai-input'),
            send: root.querySelector('.plg-ai-send'),
            cancel: root.querySelector('.plg-ai-cancel'),
            threadSelect: root.querySelector('.plg-ai-thread-select'),
            threadEdit: root.querySelector('.plg-ai-thread-edit'),
            rename: root.querySelector('.plg-ai-rename'),
            newer: root.querySelector('.plg-ai-new')
        };

        if (els.add && jPulse.UI && jPulse.UI.tooltip && typeof jPulse.UI.tooltip.init === 'function') {
            jPulse.UI.tooltip.init(els.add);
        }

        function scrollMessagesToEnd() {
            if (!els.messages) {
                return;
            }
            els.messages.scrollTop = els.messages.scrollHeight;
        }

        pinMessages = function () {
            scrollMessagesToEnd();
            requestAnimationFrame(function () {
                scrollMessagesToEnd();
                requestAnimationFrame(scrollMessagesToEnd);
            });
        };

        function commandCtx(extra) {
            const ctx = {
                capability: state.capability,
                adapter: adapter,
                thread: currentThread(),
                handle: handle,
                name: extra && extra.name || '',
                arg: extra && extra.arg || ''
            };
            ctx.framework = function () {
                const fn = FRAMEWORK_RUNNERS[ctx.name];
                return fn ? fn({ name: ctx.name, arg: ctx.arg }) : null;
            };
            return ctx;
        }

        function slashHint(cmd) {
            if (cmd && cmd.hint) {
                return String(cmd.hint);
            }
            const hints = {
                help: I18N.slashHelp,
                tools: I18N.slashTools,
                model: I18N.slashModel,
                new: I18N.slashNew,
                cancel: I18N.slashCancel,
                conversations: I18N.slashConversations,
                quota: I18N.slashQuota,
                sources: I18N.slashSources,
                status: I18N.slashStatus,
                context: I18N.slashContext
            };
            return hints[cmd && cmd.name] || '';
        }

        function hasContextOptions() {
            return typeof adapter.contextOptions === 'function';
        }

        function readContextOptions() {
            if (!hasContextOptions()) {
                return [];
            }
            const rows = adapter.contextOptions() || [];
            return (Array.isArray(rows) ? rows : []).map((row) => {
                return {
                    value: String(row && row.value != null ? row.value : ''),
                    label: String(row && row.label != null ? row.label : (row && row.value) || ''),
                    unavailable: !!(row && row.unavailable)
                };
            }).filter((row) => row.value);
        }

        function contextStorageKey() {
            return `jp:ai:context:${scopeType}:${scopeId}:${state.threadId || 'none'}`;
        }

        function contextGet() {
            return state.contextValue || '';
        }

        function firstAvailableContext(rows) {
            const available = rows.find((row) => !row.unavailable);
            return available ? available.value : (rows[0] && rows[0].value) || '';
        }

        function contextSet(value, persist) {
            const rows = readContextOptions();
            const match = rows.find((row) => row.value === String(value));
            state.contextValue = match ? match.value : firstAvailableContext(rows);
            if (persist !== false && state.threadId) {
                localStorage.setItem(contextStorageKey(), state.contextValue);
            }
            renderContextRow();
        }

        function loadThreadContext() {
            if (!hasContextOptions()) {
                state.contextValue = '';
                renderContextRow();
                return;
            }
            const rows = readContextOptions();
            const stored = state.threadId ? localStorage.getItem(contextStorageKey()) : '';
            const match = rows.find((row) => row.value === stored);
            state.contextValue = match ? match.value : firstAvailableContext(rows);
            renderContextRow();
        }

        function renderContextRow() {
            if (!els.context || !els.contextSelect) {
                return;
            }
            if (!hasContextOptions()) {
                els.context.hidden = true;
                els.contextSelect.innerHTML = '';
                return;
            }
            const rows = readContextOptions();
            els.context.hidden = rows.length === 0;
            els.contextSelect.innerHTML = rows.map((row) => {
                const label = row.unavailable
                    ? `${row.label} (${I18N.slashContextUnavailable})`
                    : row.label;
                const selected = row.value === state.contextValue ? ' selected' : '';
                return `<option value="${escapeHtml(row.value)}"${selected}>${escapeHtml(label)}</option>`;
            }).join('');
        }

        function regionRenderCtx() {
            return {
                thread: currentThread(),
                capability: state.capability,
                adapter: adapter,
                handle: handle,
                sources: state.sources.slice(),
                images: state.images.slice()
            };
        }

        function renderOneRegion(region) {
            const host = root.querySelector(`.plg-ai-anchor[data-anchor="${region.anchor}"]`);
            if (!host) {
                return;
            }
            let wrap = host.querySelector(`[data-region="${region.name}"]`);
            if (!wrap) {
                wrap = document.createElement('div');
                wrap.className = 'plg-ai-region';
                wrap.setAttribute('data-region', region.name);
                host.appendChild(wrap);
            }
            let out = null;
            if (typeof region.render === 'function') {
                try {
                    out = region.render(regionRenderCtx());
                } catch (_err) {
                    out = null;
                }
            }
            const normalized = normalizeRegionContent(out);
            wrap.textContent = '';
            if (normalized.hide) {
                wrap.hidden = true;
                return;
            }
            wrap.hidden = false;
            if (normalized.node) {
                wrap.appendChild(normalized.node);
                return;
            }
            wrap.textContent = normalized.text;
        }

        function refreshRegions(name) {
            const list = name
                ? siteRegions.filter((row) => row.name === name)
                : siteRegions;
            list.forEach(renderOneRegion);
            pinMessages();
        }

        function emitRegionEvent(event) {
            siteRegions.forEach((region) => {
                if ((region.on || []).indexOf(event) >= 0) {
                    renderOneRegion(region);
                }
            });
            pinMessages();
        }

        function showNotice(text, visible) {
            els.notice.hidden = !visible;
            els.notice.textContent = text || '';
        }

        function showToast(message, type) {
            if (!message) {
                return;
            }
            if (jPulse.UI && jPulse.UI.toast && typeof jPulse.UI.toast.show === 'function') {
                jPulse.UI.toast.show(message, type || 'error');
                return;
            }
            showNotice(message, true);
        }

        function setRunning(running) {
            state.running = running;
            els.cancel.hidden = !running;
            els.send.hidden = running;
            els.send.disabled = running;
        }

        function syncStore() {
            panelStore.sources = state.sources;
            panelStore.images = state.images;
            panelStore.caps = {
                maxSourceReadChars: (state.capability && state.capability.maxSourceReadChars) || 24000
            };
        }

        function newOpaqueId() {
            if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
                return crypto.randomUUID();
            }
            return `src-${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
        }

        function extractOutline(text) {
            const lines = String(text || '').split('\n');
            let inFence = false;
            const chunks = [{ heading: '', lines: [] }];
            lines.forEach((line) => {
                if (/^ {0,3}```/.test(line)) {
                    inFence = !inFence;
                }
                if (!inFence && /^## /.test(line)) {
                    chunks.push({ heading: line.replace(/^##\s+/, '').trim(), lines: [line] });
                } else {
                    chunks[chunks.length - 1].lines.push(line);
                }
            });
            const used = {};
            const outline = [];
            chunks.forEach((chunk) => {
                const body = chunk.lines.join('\n').trim();
                if (!body) {
                    return;
                }
                let label = chunk.heading;
                if (!label) {
                    label = body.split('\n')[0].replace(/^#\s+/, '').trim() || 'Overview';
                }
                let key = String(label || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'section';
                if (used[key]) {
                    let n = 2;
                    while (used[`${key}-${n}`]) {
                        n += 1;
                    }
                    key = `${key}-${n}`;
                }
                used[key] = true;
                outline.push({ key: key, label: label, chars: body.length });
            });
            return outline;
        }

        function sourceMeta(src) {
            return {
                kind: 'source',
                id: src.id,
                name: src.name,
                origin: src.origin,
                mimeType: src.mimeType,
                chars: src.chars,
                sections: Array.isArray(src.outline) ? src.outline.length : 0,
                url: src.provenance && (src.provenance.finalUrl || src.provenance.sourceUrl)
            };
        }

        function imageMeta(img) {
            return {
                kind: 'image',
                id: img.id,
                name: img.name,
                origin: img.origin || 'file',
                mimeType: img.mimeType,
                width: img.width || 0,
                height: img.height || 0
            };
        }

        function formatCapBytes(n) {
            const v = Number(n) || 0;
            if (v >= 1048576) {
                const mb = v / 1048576;
                const s = mb >= 10 ? String(Math.round(mb)) : mb.toFixed(1).replace(/\.0$/, '');
                return s + ' MB';
            }
            if (v >= 1024) {
                return Math.round(v / 1024) + ' KB';
            }
            return v + ' bytes';
        }

        function fileOverCap(file, cap) {
            return !!(file && Number.isFinite(file.size) && Number.isFinite(cap) && cap > 0 && file.size > cap);
        }

        function hideChipPop() {
            state.openChip = '';
            if (!els.chipPop) {
                return;
            }
            els.chipPop.hidden = true;
            els.chipPop.innerHTML = '';
        }

        function chipTip(parts) {
            return parts.filter((part) => part || part === 0).join(' · ');
        }

        function popRow(label, value, copyable) {
            const text = String(value == null ? '' : value);
            if (!text) {
                return '';
            }
            const copy = copyable
                ? `<button type="button" class="plg-ai-chip-pop-copy jp-btn jp-btn-sm" data-copy="${escapeHtml(text)}">${escapeHtml(I18N.copy)}</button>`
                : '';
            return `<div class="plg-ai-chip-pop-row"><span class="plg-ai-chip-pop-label">${escapeHtml(label)}</span>`
                + `<span class="plg-ai-chip-pop-value">${escapeHtml(text)}</span>${copy}</div>`;
        }

        function showChipPop(id, kind) {
            if (!els.chipPop) {
                return;
            }
            if (state.openChip === id) {
                hideChipPop();
                return;
            }
            let html = '';
            if (kind === 'src') {
                const src = state.sources.find((row) => row.id === id);
                if (!src) {
                    hideChipPop();
                    return;
                }
                const url = src.provenance && (src.provenance.finalUrl || src.provenance.sourceUrl);
                html = popRow(I18N.chipDetailName, src.name, true)
                    + popRow(I18N.chipDetailOrigin, src.origin)
                    + popRow(I18N.chipDetailUrl, url, true)
                    + popRow(I18N.chipDetailType, src.mimeType)
                    + popRow(I18N.chipDetailChars, src.chars);
            } else {
                const img = state.images.find((row) => row.id === id);
                if (!img) {
                    hideChipPop();
                    return;
                }
                html = popRow(I18N.chipDetailName, img.name, true)
                    + popRow(I18N.chipDetailType, img.mimeType)
                    + popRow(I18N.chipDetailSize, `${img.width || 0}×${img.height || 0}`);
            }
            state.openChip = id;
            els.chipPop.innerHTML = html;
            els.chipPop.hidden = false;
        }

        function bindChipTooltips() {
            if (els.chips && jPulse.UI && jPulse.UI.tooltip && typeof jPulse.UI.tooltip.initAll === 'function') {
                jPulse.UI.tooltip.initAll(els.chips);
            }
        }

        function chipIcon(kind) {
            if (kind === 'url') {
                return '🔗';
            }
            if (kind === 'image') {
                return '🖼';
            }
            return '📄';
        }

        function hasAttach() {
            return typeof adapter.attach === 'function';
        }

        function attachmentRow(id) {
            const src = state.sources.find((row) => row.id === id);
            if (src) {
                return sourceMeta(src);
            }
            const img = state.images.find((row) => row.id === id);
            return img ? imageMeta(img) : null;
        }

        function attachGate(row) {
            if (typeof adapter.canAttach !== 'function') {
                return { ok: true };
            }
            const out = adapter.canAttach(row);
            if (out && out.ok === false) {
                return {
                    ok: false,
                    reason: out.reason || I18N.chipAttachBlocked
                };
            }
            return { ok: true };
        }

        function chipAttachChrome(id, kind) {
            if (!hasAttach()) {
                return '';
            }
            return `<span class="plg-ai-chip-more-wrap">`
                + `<button type="button" class="plg-ai-chip-more" data-chip-more="${escapeHtml(id)}" data-chip-kind="${kind}" aria-haspopup="menu" aria-expanded="false" aria-label="${escapeHtml(I18N.chipAttach)}">⋯</button>`
                + `<div class="plg-ai-chip-menu" hidden role="menu">`
                + `<button type="button" class="plg-ai-chip-attach" data-chip-attach="${escapeHtml(id)}" data-chip-kind="${kind}" role="menuitem">${escapeHtml(I18N.chipAttach)}</button>`
                + `</div></span>`;
        }

        function renderStrip() {
            const cap = state.capability || {};
            const show = cap.sourcesEnabled !== false || (cap.imagesEnabled !== false && cap.imagesAvailable !== false);
            if (!els.strip) {
                return;
            }
            els.strip.hidden = !show && !state.sources.length && !state.images.length;
            if (!els.chips) {
                return;
            }
            if (state.openChip) {
                const still = state.sources.some((row) => row.id === state.openChip)
                    || state.images.some((row) => row.id === state.openChip);
                if (!still) {
                    hideChipPop();
                }
            }
            const chips = [];
            state.sources.forEach((src) => {
                const url = src.provenance && (src.provenance.finalUrl || src.provenance.sourceUrl);
                const tip = chipTip([src.name, url || src.origin, src.chars]);
                const kind = src.origin === 'url' ? 'url' : 'file';
                chips.push(
                    `<div class="plg-ai-chip jp-tooltip" data-tooltip="${escapeHtml(tip)}">`
                    + `<button type="button" class="plg-ai-chip-body" data-src="${escapeHtml(src.id)}">`
                    + `<span class="plg-ai-chip-icon" aria-hidden="true">${chipIcon(kind)}</span>`
                    + `<span class="plg-ai-chip-name">${escapeHtml(src.name)}</span>`
                    + '</button>'
                    + chipAttachChrome(src.id, 'src')
                    + `<button type="button" class="plg-ai-chip-remove" data-remove="${escapeHtml(src.id)}" title="${escapeHtml(I18N.chipRemove)}" aria-label="${escapeHtml(I18N.chipRemove)}">×</button>`
                    + '</div>'
                );
            });
            state.images.forEach((img) => {
                const tip = chipTip([img.name, `${img.width || 0}×${img.height || 0}`]);
                chips.push(
                    `<div class="plg-ai-chip plg-ai-chip--image jp-tooltip" data-tooltip="${escapeHtml(tip)}">`
                    + `<button type="button" class="plg-ai-chip-body" data-img="${escapeHtml(img.id)}">`
                    + `<span class="plg-ai-chip-icon" aria-hidden="true">${chipIcon('image')}</span>`
                    + `<span class="plg-ai-chip-name">${escapeHtml(img.name)}</span>`
                    + '</button>'
                    + chipAttachChrome(img.id, 'img')
                    + `<button type="button" class="plg-ai-chip-remove" data-remove-img="${escapeHtml(img.id)}" title="${escapeHtml(I18N.chipRemove)}" aria-label="${escapeHtml(I18N.chipRemove)}">×</button>`
                    + '</div>'
                );
            });
            els.chips.innerHTML = chips.join('');
            bindChipTooltips();
            if (els.addUrl) {
                els.addUrl.hidden = cap.urlIngestEnabled === false || cap.sourcesEnabled === false;
            }
            emitRegionEvent('sources');
        }

        async function refreshCapability() {
            const capability = await transport.probe({
                hasSources: state.sources.length > 0,
                hasImages: state.images.length > 0,
                threadId: state.threadId
            });
            state.capability = capability;
            syncStore();
            renderStrip();
            emitRegionEvent('capability');
            return capability;
        }

        function addTextSource(text, opts) {
            const cap = state.capability || {};
            const maxCount = cap.maxSourcesPerConversation || 5;
            const maxChars = cap.maxSourceChars || 1000000;
            if (state.sources.length >= maxCount) {
                showToast(`This conversation already has ${maxCount} sources, the maximum.`, 'error');
                return null;
            }
            let body = String(text || '');
            if (!body.trim()) {
                return null;
            }
            let truncated = false;
            if (body.length > maxChars) {
                body = body.slice(0, maxChars);
                truncated = true;
            }
            const src = {
                id: (opts && opts.id) || newOpaqueId(),
                name: (opts && opts.name) || 'Untitled',
                origin: (opts && opts.origin) || 'paste',
                mimeType: (opts && opts.mimeType) || 'text/plain',
                text: body,
                chars: body.length,
                outline: extractOutline(body),
                provenance: (opts && opts.provenance) || {},
                truncated: truncated
            };
            state.sources.push(src);
            if (opts && opts.file) {
                panelStore.files.set(src.id, opts.file);
            }
            syncStore();
            renderStrip();
            refreshCapability();
            return src;
        }

        function classifyFile(file) {
            const cap = state.capability || {};
            const name = String((file && file.name) || '');
            const type = String((file && file.type) || '').toLowerCase();
            const ext = name.lastIndexOf('.') >= 0 ? name.slice(name.lastIndexOf('.')).toLowerCase() : '';
            if (type.indexOf('image/') === 0 || ['.png', '.jpg', '.jpeg', '.webp', '.gif'].indexOf(ext) >= 0) {
                if (cap.imagesEnabled === false) {
                    return { ok: false, error: `File type ${ext || type || 'unknown'} is not supported.` };
                }
                if (cap.imagesAvailable === false) {
                    return { ok: false, error: I18N.imagesUnavailable };
                }
                return { ok: true, image: true, mimeType: type || 'image/jpeg' };
            }
            if (cap.sourcesEnabled === false) {
                return { ok: false, error: `File type ${ext || type || 'unknown'} is not supported.` };
            }
            if (ext === '.md' || ext === '.markdown') {
                return { ok: true, mimeType: 'text/markdown' };
            }
            if (ext === '.csv') {
                return { ok: true, mimeType: 'text/csv' };
            }
            if (ext === '.txt' || type.indexOf('text/') === 0) {
                return { ok: true, mimeType: type || 'text/plain' };
            }
            const converters = (state.capability && state.capability.converters) || [];
            const match = converters.find((row) => {
                return (row.extensions || []).indexOf(ext) >= 0
                    || (row.mimeTypes || []).indexOf(type) >= 0;
            });
            if (match) {
                return { ok: true, convert: true, mimeType: type || (match.mimeTypes && match.mimeTypes[0]) || '' };
            }
            if (ext === '.pdf' || type === 'application/pdf') {
                return { ok: false, error: I18N.noConverter };
            }
            return { ok: false, error: `File type ${ext || type || 'unknown'} is not supported.` };
        }

        async function resizeImage(file, maxEdge) {
            const edge = maxEdge || (state.capability && state.capability.maxImageEdge) || 2048;
            if (!window.createImageBitmap || !document.createElement) {
                return file;
            }
            try {
                const bitmap = await createImageBitmap(file);
                const scale = Math.min(1, edge / Math.max(bitmap.width, bitmap.height));
                const width = Math.max(1, Math.round(bitmap.width * scale));
                const height = Math.max(1, Math.round(bitmap.height * scale));
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(bitmap, 0, 0, width, height);
                const blob = await new Promise((resolve) => {
                    canvas.toBlob(resolve, file.type || 'image/jpeg', 0.9);
                });
                return { blob: blob || file, width: width, height: height, name: file.name, mimeType: file.type || 'image/jpeg' };
            } catch (_err) {
                return { blob: file, width: 0, height: 0, name: file.name, mimeType: file.type || 'image/jpeg' };
            }
        }

        async function addImageFile(file, opts) {
            const cap = state.capability || {};
            if (cap.imagesEnabled === false) {
                showToast(`File type ${(file && file.type) || 'unknown'} is not supported.`, 'error');
                flashDropRefuse();
                return;
            }
            if (cap.imagesAvailable === false) {
                showToast(I18N.imagesUnavailable, 'error');
                flashDropRefuse();
                return;
            }
            const threadId = await ensureThread();
            const resized = await resizeImage(file);
            const imageId = newOpaqueId();
            const res = await fetch('/api/1/ai/image/stage', {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': resized.mimeType || 'application/octet-stream',
                    'X-Ai-Thread-Id': threadId,
                    'X-Ai-Image-Id': imageId,
                    'X-Ai-Name': resized.name || 'image',
                    'X-Ai-Mime-Type': resized.mimeType || 'image/jpeg',
                    'X-Ai-Width': String(resized.width || 0),
                    'X-Ai-Height': String(resized.height || 0)
                },
                body: resized.blob
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok || body.success === false) {
                showToast((body && body.error) || I18N.error, 'error');
                flashDropRefuse();
                return;
            }
            panelStore.files.set(imageId, file);
            state.images.push({
                id: imageId,
                name: resized.name || 'image',
                mimeType: resized.mimeType,
                width: resized.width,
                height: resized.height,
                origin: (opts && opts.origin) || 'file'
            });
            syncStore();
            renderStrip();
            refreshCapability();
        }

        async function addDroppedFile(file, opts) {
            const kind = classifyFile(file);
            if (!kind.ok) {
                showToast(kind.error || I18N.error, 'error');
                flashDropRefuse();
                return;
            }
            if (kind.image) {
                const imageCap = (state.capability && state.capability.maxImageBytes) || 4194304;
                if (fileOverCap(file, imageCap)) {
                    showToast(fillToken(I18N.oversizeFile, '%SIZE%', formatCapBytes(imageCap)), 'error');
                    flashDropRefuse();
                    return;
                }
                await addImageFile(file, { origin: (opts && opts.origin) || 'file' });
                return;
            }
            if (kind.convert) {
                const convertCap = (state.capability && state.capability.maxConvertBytes) || 26214400;
                if (fileOverCap(file, convertCap)) {
                    showToast(fillToken(I18N.oversizeFile, '%SIZE%', formatCapBytes(convertCap)), 'error');
                    flashDropRefuse();
                    return;
                }
                const threadId = await ensureThread();
                const res = await fetch('/api/1/ai/source/convert', {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: {
                        'Content-Type': file.type || 'application/octet-stream',
                        'X-Ai-Name': file.name || 'Untitled',
                        'X-Ai-Mime-Type': kind.mimeType,
                        'X-Ai-Thread-Id': threadId
                    },
                    body: file
                });
                const body = await res.json().catch(() => ({}));
                if (!res.ok || body.success === false) {
                    showToast((body && body.error) || I18N.noConverter, 'error');
                    flashDropRefuse();
                    return;
                }
                addTextSource(body.data && body.data.text, {
                    name: file.name,
                    origin: 'file',
                    mimeType: 'text/markdown',
                    file: file,
                    provenance: { truncated: body.data && body.data.truncated }
                });
                return;
            }
            const text = await file.text();
            addTextSource(text, {
                name: file.name,
                origin: 'file',
                mimeType: kind.mimeType,
                file: file
            });
        }

        async function fetchUrlSource(url) {
            const res = await jPulse.api.post('/api/1/ai/source/fetch', { url: url });
            if (!res.success) {
                showToast(res.error || I18N.error, 'error');
                return null;
            }
            return addTextSource(res.data.text, {
                name: res.data.name,
                origin: 'url',
                mimeType: res.data.mimeType,
                provenance: res.data.provenance
            });
        }

        function extractPromptUrl(text) {
            const raw = String(text || '');
            const match = raw.match(/https?:\/\/[^\s<>"'`]+/i);
            if (!match) {
                return null;
            }
            if (raw.length > 800) {
                return null;
            }
            if (/\b(is|are)\s+(this|that|the)\s+(link|url|page|site)\b/i.test(raw)) {
                return null;
            }
            if (/\b(what|who|where|why|how|describe|explain|summarize|tell|was|wer|wo|warum|wie|beschreib\w*|erkl[aä]r\w*)\b/i.test(raw)) {
                return null;
            }
            if (/\b(safe|phishing|malware|virus)\b/i.test(raw)) {
                return null;
            }
            return match[0].replace(/[),.;:!?]+$/, '');
        }

        function hideIntercept() {
            state.intercept = null;
            if (els.intercept) {
                els.intercept.hidden = true;
                els.intercept.innerHTML = '';
            }
        }

        function showIntercept(url, text) {
            state.intercept = { url: url, text: text };
            els.intercept.hidden = false;
            els.intercept.innerHTML = [
                `<div class="plg-ai-intercept-title">${escapeHtml(I18N.interceptTitle)}</div>`,
                `<div class="plg-ai-intercept-url">${escapeHtml(url)}</div>`,
                '<div class="plg-ai-intercept-actions">',
                `  <button type="button" class="jp-btn jp-btn-primary jp-btn-sm" data-ai-fetch>${escapeHtml(I18N.interceptFetch)}</button>`,
                `  <button type="button" class="jp-btn jp-btn-sm" data-ai-skip>${escapeHtml(I18N.interceptSkip)}</button>`,
                `  <button type="button" class="jp-btn jp-btn-sm" data-ai-cancel-fetch>${escapeHtml(I18N.interceptCancel)}</button>`,
                '</div>'
            ].join('');
        }

        async function clearAttachments() {
            const threadId = state.threadId;
            state.sources = [];
            state.images = [];
            panelStore.files.clear();
            hideIntercept();
            syncStore();
            renderStrip();
            if (threadId) {
                try {
                    await jPulse.api.delete(`/api/1/ai/thread/${encodeURIComponent(threadId)}/images`);
                } catch (_err) {
                    /* mailbox TTL is the fallback */
                }
            }
        }

        function attachmentCount() {
            return state.sources.length + state.images.length;
        }

        async function confirmDropAttachments() {
            if (attachmentCount() === 0) {
                return true;
            }
            if (jPulse.UI && typeof jPulse.UI.confirmDialog === 'function') {
                const result = await jPulse.UI.confirmDialog({
                    title: I18N.newConfirmTitle,
                    message: I18N.newConfirmBody,
                    buttons: [I18N.cancel, I18N.newConversation]
                });
                return !!(result && result.confirmed);
            }
            return window.confirm(I18N.newConfirmBody);
        }

        async function confirmDropAttachmentsForSwitch(threadId) {
            const sameThread = String(threadId || '') === state.threadId;
            if (sameThread || attachmentCount() === 0) {
                return true;
            }
            return confirmDropAttachments();
        }

        function sourceRefsBadge(turn) {
            const refs = (turn && turn.sourceRefs) || [];
            if (!refs.length) {
                return '';
            }
            const names = refs.map((row) => row.name || row.id).join(', ');
            return `<div class="plg-ai-refs">${escapeHtml(I18N.usedSources)} ${escapeHtml(names)}</div>`;
        }

        async function refreshThreads() {
            const query = new URLSearchParams({
                scopeType: scopeType,
                scopeId: scopeId,
                limit: '20'
            });
            const res = await jPulse.api.get(`/api/1/ai/thread?${query.toString()}`);
            if (!res.success) {
                showToast(I18N.loadError, 'error');
                return;
            }
            state.threads = (res.data || []).slice(0, 20);
            renderThreads();
        }

        function threadOptionLabel(thread) {
            const name = thread.label || I18N.unnamed;
            const raw = thread.updatedAt || thread.createdAt;
            if (!raw || !jPulse.date || typeof jPulse.date.formatLocalDate !== 'function') {
                return name;
            }
            return `${name} — ${jPulse.date.formatLocalDate(raw)}`;
        }

        function renderThreads() {
            if (!state.threads.length) {
                els.threadSelect.innerHTML = `<option value="">${escapeHtml(I18N.empty)}</option>`;
                els.threadSelect.disabled = true;
                return;
            }
            els.threadSelect.disabled = false;
            els.threadSelect.innerHTML = state.threads.map((thread) => {
                const id = String(thread._id);
                const selected = id === state.threadId ? ' selected' : '';
                return `<option value="${escapeHtml(id)}"${selected}>${escapeHtml(threadOptionLabel(thread))}</option>`;
            }).join('');
        }

        function currentThread() {
            return state.threads.find((thread) => String(thread._id) === state.threadId) || null;
        }

        function applyThreadModel(thread) {
            if (thread && thread.provider && thread.model) {
                state.selectedProvider = thread.provider;
                state.selectedModel = thread.model;
                return;
            }
            const def = state.capability && state.capability.defaultModel;
            state.selectedProvider = def && def.provider || '';
            state.selectedModel = def && def.model || '';
        }

        function renderPlain(text) {
            const escaped = escapeHtml(text || '').replace(/`([^`\n]+)`/g, '<code>$1</code>');
            return `<div class="plg-ai-plain">${escaped}</div>`;
        }

        function entryTime(value, fallback) {
            if (!value) {
                return fallback;
            }
            const ms = new Date(value).getTime();
            return Number.isFinite(ms) ? ms : fallback;
        }

        function proposingOffered() {
            const tools = (state.capability && state.capability.tools) || [];
            return tools.some((tool) => tool.proposes);
        }

        function claimPhrases() {
            return (state.capability && state.capability.proposalClaimPhrases) || [];
        }

        function scopeCanWrite() {
            const scope = state.capability && state.capability.scope;
            return !scope || scope.canWrite !== false;
        }

        function cardApplyState(card) {
            if (!card || card.applied || card.undone) {
                return { ok: false, reason: 'done' };
            }
            if (state.running) {
                return { ok: false, reason: 'running' };
            }
            if (!scopeCanWrite()) {
                return { ok: false, reason: 'readonly' };
            }
            if (state.cardBusy[card.id]) {
                return { ok: false, reason: 'busy' };
            }
            return { ok: true };
        }

        function renderCardHtml(turn, card) {
            const applyState = cardApplyState(card);
            const status = card.error
                ? escapeHtml(card.error)
                : card.undone
                    ? escapeHtml(I18N.cardUndone)
                    : card.applied
                        ? escapeHtml(I18N.cardApplied)
                        : applyState.reason === 'running'
                            ? escapeHtml(I18N.cardRunning)
                            : applyState.reason === 'readonly'
                                ? escapeHtml(I18N.cardReadOnly)
                                : '';
            const applyHidden = applyState.ok ? '' : ' hidden';
            const undoHidden = card.applied && !card.undone && !state.running && scopeCanWrite() ? '' : ' hidden';
            return [
                `<section class="plg-ai-card" data-ai-card data-proposal-id="${escapeHtml(card.id)}" data-turn-id="${escapeHtml(String(turn._id))}">`,
                `  <div class="plg-ai-card-kind">${escapeHtml(card.kind || '')}</div>`,
                '  <div class="plg-ai-card-preview"></div>',
                '  <div class="plg-ai-card-actions">',
                `    <button type="button" class="jp-btn jp-btn-primary jp-btn-sm" data-ai-apply="${escapeHtml(card.id)}"${applyHidden}>${escapeHtml(I18N.cardApply)}</button>`,
                `    <button type="button" class="jp-btn jp-btn-sm" data-ai-undo="${escapeHtml(card.id)}"${undoHidden}>${escapeHtml(I18N.cardUndo)}</button>`,
                '  </div>',
                status ? `  <div class="plg-ai-card-status">${status}</div>` : '',
                '</section>'
            ].join('');
        }

        function hydrateCardPreviews() {
            els.messages.querySelectorAll('[data-ai-card]').forEach((el) => {
                const turn = state.turns.find((row) => String(row._id) === el.getAttribute('data-turn-id'));
                const card = ((turn && turn.proposals) || []).find((row) => row.id === el.getAttribute('data-proposal-id'));
                const box = el.querySelector('.plg-ai-card-preview');
                if (!box || !card) {
                    return;
                }
                if (typeof adapter.renderProposalPreview === 'function') {
                    const out = adapter.renderProposalPreview(card);
                    if (out && typeof out === 'object' && out.nodeType) {
                        box.textContent = '';
                        box.appendChild(out);
                        return;
                    }
                    box.textContent = String(out || card.preview || '');
                    return;
                }
                box.textContent = card.preview || card.kind || '';
            });
        }

        function stampProposal(turnId, proposalId, fields) {
            state.turns.forEach((turn) => {
                if (String(turn._id) !== String(turnId) || !Array.isArray(turn.proposals)) {
                    return;
                }
                turn.proposals.forEach((row) => {
                    if (row.id === proposalId) {
                        Object.assign(row, fields);
                    }
                });
            });
        }

        async function renderTurnHtml(turn) {
            const userText = turn.userText || '';
            const agentText = turn.agentText || '';
            const err = turn.error || '';
            if (!agentText && !err && userText === '/') {
                return '';
            }
            const parts = [];
            if (userText) {
                parts.push(`<article class="plg-ai-turn"><div class="plg-ai-user">${escapeHtml(userText)}</div>${sourceRefsBadge(turn)}`);
            } else {
                parts.push('<article class="plg-ai-turn">');
            }
            if (agentText) {
                parts.push(`<div class="plg-ai-agent">${await renderMarkdown(agentText)}</div>`);
            } else if (err) {
                parts.push(`<div class="plg-ai-agent">${renderPlain(err)}</div>`);
            }
            const cards = Array.isArray(turn.proposals) ? turn.proposals : [];
            const pending = cards.filter((card) => cardApplyState(card).ok);
            if (pending.length >= 2) {
                parts.push(
                    `<div class="plg-ai-card-all"><button type="button" class="jp-btn jp-btn-sm" data-ai-apply-all="${escapeHtml(String(turn._id))}">${escapeHtml(I18N.cardApplyAll)}</button></div>`
                );
            }
            cards.forEach((card) => {
                parts.push(renderCardHtml(turn, card));
            });
            if (!cards.length && proposingOffered() && claimsWithoutCard(agentText, claimPhrases())) {
                parts.push(`<div class="plg-ai-guard">${escapeHtml(I18N.cardGuard)}</div>`);
            }
            parts.push('</article>');
            return parts.join('');
        }

        async function renderTurns() {
            const items = [];
            state.turns.forEach((turn, idx) => {
                items.push({
                    kind: 'turn',
                    at: entryTime(turn.createdAt, idx),
                    seq: Number(turn.seq) || idx,
                    turn: turn
                });
            });
            state.locals.forEach((local, idx) => {
                items.push({
                    kind: 'local',
                    at: Number(local.at) || 0,
                    seq: idx,
                    local: local
                });
            });
            items.sort((a, b) => {
                if (a.at !== b.at) {
                    return a.at - b.at;
                }
                if (a.kind !== b.kind) {
                    return a.kind === 'local' ? -1 : 1;
                }
                return a.seq - b.seq;
            });
            state.locals.forEach((local) => {
                if (local.agentNode && local.agentNode.parentNode) {
                    local.agentNode.parentNode.removeChild(local.agentNode);
                }
            });
            const html = [];
            for (const item of items) {
                if (item.kind === 'local') {
                    html.push(`<article class="plg-ai-turn plg-ai-turn--local"><div class="plg-ai-user">${escapeHtml(item.local.userText || '')}</div>`);
                    html.push(`<div class="plg-ai-agent" data-ai-local="${item.seq}"></div></article>`);
                    continue;
                }
                html.push(await renderTurnHtml(item.turn));
            }
            if (state.pendingUser || state.streaming || (state.running && !state.streaming)) {
                html.push('<article class="plg-ai-turn plg-ai-turn--live">');
                if (state.pendingUser) {
                    html.push(`<div class="plg-ai-user">${escapeHtml(state.pendingUser)}</div>`);
                }
                if (state.streaming) {
                    html.push(`<div class="plg-ai-agent">${await renderMarkdown(state.streaming)}</div>`);
                } else if (state.running) {
                    html.push(
                        `<div class="plg-ai-agent" role="status" aria-label="${escapeHtml(I18N.thinking)}">`
                        + '<span class="plg-ai-dots" aria-hidden="true"><span></span><span></span><span></span></span>'
                        + '</div>'
                    );
                }
                html.push('</article>');
            }
            els.messages.innerHTML = html.join('');
            state.locals.forEach((local, idx) => {
                const box = els.messages.querySelector(`[data-ai-local="${idx}"]`);
                if (!box) {
                    return;
                }
                if (local.agentNode) {
                    box.appendChild(local.agentNode);
                    return;
                }
                box.innerHTML = renderPlain(local.agentText);
            });
            pinCopyButtons(els.messages);
            hydrateCardPreviews();
            pinMessages();
        }

        async function openThread(threadId, options) {
            const sameThread = String(threadId || '') === state.threadId;
            if (!sameThread) {
                await clearAttachments();
            }
            state.threadId = String(threadId || '');
            if (!(options && options.keepLocals && sameThread)) {
                state.locals = [];
            }
            state.pendingUser = '';
            state.streaming = '';
            cancelRename();
            if (state.threadId) {
                localStorage.setItem(threadKey, state.threadId);
            }
            if (!state.threadId) {
                state.turns = [];
                applyThreadModel(null);
                await renderTurns();
                renderThreads();
                loadThreadContext();
                emitRegionEvent('thread');
                return;
            }
            await refreshThreads();
            const res = await jPulse.api.get(`/api/1/ai/thread/${encodeURIComponent(state.threadId)}/turns`);
            state.turns = res.success ? (res.data || []) : [];
            applyThreadModel(currentThread());
            const running = state.turns.some((turn) => turn.status === 'running');
            setRunning(running);
            showNotice(running ? I18N.running : '', running);
            if (state.capability && state.capability.transport === 'ws') {
                await transport.connectWs(state.threadId);
            }
            if (els.notice.textContent === I18N.reconnecting) {
                showNotice(running ? I18N.running : '', running);
            }
            await renderTurns();
            renderThreads();
            loadThreadContext();
            emitRegionEvent('thread');
        }

        async function ensureThread() {
            if (state.threadId) {
                return state.threadId;
            }
            const res = await jPulse.api.post('/api/1/ai/thread', {
                scopeType: scopeType,
                scopeId: scopeId
            });
            if (!res.success) {
                throw new Error(res.error || I18N.error);
            }
            state.threadId = String(res.data._id);
            localStorage.setItem(threadKey, state.threadId);
            await refreshThreads();
            return state.threadId;
        }

        function visibleCatalog() {
            return catalog.filter((cmd) => !cmd.hidden && commandAvailable(cmd, commandCtx()));
        }

        function fillCompose(text) {
            els.input.value = String(text || '');
            els.input.focus();
        }

        function appendLinkedRow(parent, row) {
            const parsed = parseExampleRow(row);
            if (!parsed) {
                return;
            }
            const line = document.createElement('div');
            line.className = 'plg-ai-help-line';
            parsed.parts.forEach((part) => {
                if (part.type === 'link') {
                    const btn = document.createElement('button');
                    btn.type = 'button';
                    btn.className = 'plg-ai-help-example';
                    btn.textContent = part.text;
                    btn.addEventListener('click', () => {
                        fillCompose(part.prompt);
                    });
                    line.appendChild(btn);
                    return;
                }
                line.appendChild(document.createTextNode(part.text));
            });
            parent.appendChild(line);
        }

        function linkedBlock(lines) {
            const wrap = document.createElement('div');
            wrap.className = 'plg-ai-help';
            (lines || []).forEach((row) => {
                if (row === '') {
                    const gap = document.createElement('div');
                    gap.className = 'plg-ai-help-gap';
                    wrap.appendChild(gap);
                    return;
                }
                appendLinkedRow(wrap, row);
            });
            return wrap;
        }

        function slashHelpNode() {
            const wrap = document.createElement('div');
            wrap.className = 'plg-ai-help';
            visibleCatalog().forEach((cmd) => {
                appendLinkedRow(wrap, `[[/${cmd.name}]] — ${slashHint(cmd)}`);
            });
            const examples = Array.isArray(options.examples) ? options.examples : [];
            if (!examples.length) {
                return wrap;
            }
            const heading = document.createElement('div');
            heading.className = 'plg-ai-help-examples-label';
            heading.textContent = I18N.slashExamples;
            wrap.appendChild(heading);
            examples.forEach((row) => {
                appendLinkedRow(wrap, row);
            });
            return wrap;
        }

        function toolsText() {
            const cap = state.capability || {};
            const tools = cap.tools || [];
            const withheld = cap.withheld || [];
            if (!tools.length && !withheld.length) {
                return I18N.slashNone;
            }
            const rows = tools.map((tool) => {
                return `\`${tool.name}\` · ${I18N.slashHost} ${tool.host || 'server'} — ${tool.description || ''}`;
            });
            withheld.forEach((row) => {
                const reason = row.reason === 'reserved' ? I18N.slashReasonReserved : (row.reason || '');
                rows.push(`${I18N.slashWithheld} \`${row.name}\` · ${I18N.slashReason} ${reason}`);
            });
            return rows.join('\n');
        }

        function modelOnMenu(pair) {
            const menu = (state.capability && state.capability.models) || [];
            return menu.some((row) => {
                return row.provider === pair.provider && row.model === pair.model && row.available !== false;
            });
        }

        function modelStatusLines(prefix) {
            const cap = state.capability || {};
            const def = cap.defaultModel || {};
            const provider = state.selectedProvider || def.provider || '';
            const model = state.selectedModel || def.model || '';
            const isDefault = provider === def.provider && model === def.model;
            const lines = prefix ? [prefix, ''] : [];
            lines.push(
                `${I18N.provider}: ${provider || '—'}`,
                `${I18N.model}: ${model || '—'}${isDefault && model ? ` (${I18N.siteDefault})` : ''}`,
                '',
                I18N.available + ':'
            );
            (cap.models || []).forEach((row) => {
                const pair = `${row.provider}/${row.model}`;
                const label = row.label && row.label !== pair ? ` — ${row.label}` : '';
                const off = row.available === false ? ' (off)' : '';
                lines.push(`[[/model ${pair}]]${label}${off}`);
            });
            return lines;
        }

        function hideSlashPicker() {
            els.slash.hidden = true;
            els.slash.innerHTML = '';
            state.slashHighlight = 0;
        }

        function renderSlashPicker() {
            const matches = filterSlashCommands(els.input.value, catalog, commandCtx());
            if (!matches.length) {
                hideSlashPicker();
                return;
            }
            if (state.slashHighlight >= matches.length) {
                state.slashHighlight = 0;
            }
            els.slash.hidden = false;
            els.slash.innerHTML = matches.map((cmd, idx) => {
                const active = idx === state.slashHighlight ? ' plg-ai-slash-item--active' : '';
                return `<button type="button" class="plg-ai-slash-item${active}" data-name="${escapeHtml(cmd.name)}">/${escapeHtml(cmd.name)} — ${escapeHtml(slashHint(cmd))}</button>`;
            }).join('');
            const active = els.slash.querySelector('.plg-ai-slash-item--active');
            if (active && typeof active.scrollIntoView === 'function') {
                active.scrollIntoView({ block: 'nearest' });
            }
        }

        function updateSlashPicker() {
            const value = els.input.value;
            if (value.startsWith('/') && !value.startsWith('//')) {
                renderSlashPicker();
                return;
            }
            hideSlashPicker();
        }

        function slashDisplay(cmd) {
            return cmd.arg ? `/${cmd.name} ${cmd.arg}` : `/${cmd.name}`;
        }

        async function appendLocal(userText, agentReply) {
            const entry = {
                userText: userText,
                agentText: '',
                agentNode: null,
                at: Date.now()
            };
            if (agentReply && typeof agentReply === 'object' && agentReply.nodeType) {
                entry.agentNode = agentReply;
            } else if (agentReply != null) {
                entry.agentText = String(agentReply);
            }
            state.locals.push(entry);
            await renderTurns();
        }

        async function runModel(cmd) {
            if (!cmd.arg) {
                return linkedBlock(modelStatusLines());
            }
            const pair = parseModelArg(cmd.arg);
            if (!pair || !modelOnMenu(pair)) {
                return I18N.modelNotAllowed;
            }
            state.selectedProvider = pair.provider;
            state.selectedModel = pair.model;
            if (state.threadId) {
                const res = await jPulse.api.put(`/api/1/ai/thread/${encodeURIComponent(state.threadId)}`, pair);
                if (!res.success) {
                    return res.error || res.code || I18N.modelNotAllowed;
                }
                const thread = currentThread();
                if (thread) {
                    thread.provider = pair.provider;
                    thread.model = pair.model;
                }
            }
            const setLine = fillToken(I18N.modelSet, '%MODEL%', `${pair.provider}/${pair.model}`);
            return linkedBlock(modelStatusLines(setLine));
        }

        async function runConversations(cmd) {
            const threads = state.threads || [];
            if (!threads.length) {
                return I18N.slashConversationsNone;
            }
            const arg = String(cmd.arg || '').trim();
            if (arg) {
                const index = parseInt(arg, 10);
                if (!Number.isFinite(index) || index < 1 || index > threads.length) {
                    return I18N.slashConversationsBad;
                }
                const thread = threads[index - 1];
                if (!(await confirmDropAttachmentsForSwitch(thread._id))) {
                    return false;
                }
                await openThread(thread._id);
                return fillToken(I18N.slashConversationsOpened, '%LABEL%', threadOptionLabel(thread));
            }
            return linkedBlock(threads.map((thread, idx) => {
                return `[[/conversations ${idx + 1}]] — ${threadOptionLabel(thread)}`;
            }));
        }

        function runQuota() {
            const quota = state.capability && state.capability.quota;
            const rows = quota && quota.rows;
            if (!Array.isArray(rows) || !rows.length) {
                return I18N.slashQuotaNone;
            }
            return rows.map((row) => {
                const used = row.used == null ? '—' : row.used;
                const limit = row.limit == null ? '—' : row.limit;
                let line = `${row.dimension} (${row.period}): ${used} / ${limit}`;
                if (row.dimension === 'cost' && row.costUnknown) {
                    line += ` (${I18N.slashCostUnknown})`;
                }
                return line;
            }).join('\n');
        }

        function runSources() {
            const cap = state.capability || {};
            const lines = [];
            state.sources.forEach((src) => {
                lines.push(`${src.name} · ${src.origin} · ${src.chars}`);
            });
            state.images.forEach((img) => {
                lines.push(`${img.name} · ${img.origin || 'file'} · ${img.width || 0}×${img.height || 0}`);
            });
            if (!lines.length) {
                lines.push(I18N.slashSourcesNone);
            }
            if (cap.maxSourcesPerConversation) {
                lines.push(`${I18N.slashSourcesCap}: ${state.sources.length} / ${cap.maxSourcesPerConversation}`);
            }
            return lines.join('\n');
        }

        function runStatus() {
            const cap = state.capability || {};
            const pair = `${state.selectedProvider || '—'}/${state.selectedModel || '—'}`;
            return [
                `${I18N.slashStatusChats}: ${(state.threads || []).length}`,
                `${I18N.slashStatusTurns}: ${(state.turns || []).length}`,
                `${I18N.slashStatusTransport}: ${cap.transport || 'http'}`,
                `${I18N.slashStatusThread}: ${state.threadId || '—'}`,
                `${I18N.slashStatusModel}: ${pair}`,
                state.running ? I18N.slashStatusRunning : I18N.slashStatusIdle
            ].join('\n');
        }

        function runContext() {
            const rows = readContextOptions();
            const value = contextGet();
            const current = rows.find((row) => row.value === value);
            const label = current ? current.label : value;
            const target = typeof adapter.describeTarget === 'function' ? adapter.describeTarget() : '';
            const lines = [
                `${I18N.slashContextCurrent}: ${label || '—'}`,
                target ? `${I18N.slashContextTarget}: ${target}` : '',
                '',
                `${I18N.slashContextOptions}:`
            ].filter((line, idx, all) => line !== '' || (idx > 0 && all[idx - 1] !== ''));
            rows.forEach((row) => {
                const mark = row.value === value ? '* ' : '  ';
                const extra = row.unavailable ? ` (${I18N.slashContextUnavailable})` : '';
                lines.push(`${mark}${row.label}${extra}`);
            });
            return lines.join('\n');
        }

        async function runCancel() {
            if (!state.running) {
                return I18N.slashCancelIdle;
            }
            await cancelTurn();
            return I18N.cancel;
        }

        const FRAMEWORK_RUNNERS = {
            help: slashHelpNode,
            tools: toolsText,
            model: runModel,
            new: async function () {
                if (!(await confirmDropAttachments())) {
                    return false;
                }
                await createNew();
                return I18N.newConversation;
            },
            cancel: runCancel,
            conversations: runConversations,
            quota: runQuota,
            sources: runSources,
            status: runStatus,
            context: runContext
        };

        async function applySlash(cmd) {
            const entry = lookupCommand(catalog, cmd.name);
            if (!entry || !commandAvailable(entry, commandCtx(cmd))) {
                return I18N.slashUnknown;
            }
            const ctx = commandCtx(cmd);
            if (typeof entry.run === 'function') {
                return entry.run(ctx);
            }
            const runner = FRAMEWORK_RUNNERS[entry.name];
            if (typeof runner === 'function') {
                return runner(cmd);
            }
            return I18N.slashUnknown;
        }

        async function runSlash(cmd) {
            const reply = await applySlash(cmd);
            if (reply === false) {
                return;
            }
            if (reply === null) {
                await appendLocal(slashDisplay(cmd), '');
                return;
            }
            await appendLocal(slashDisplay(cmd), reply);
        }

        function commandFromPicker(name) {
            const parsed = parseSlashCommand(els.input.value.trim(), catalog, commandCtx());
            if (parsed && parsed.kind === 'command' && parsed.name === name) {
                return parsed;
            }
            const leftover = String(els.input.value || '').replace(/^\/[a-z]*/i, '').trim();
            return { kind: 'command', name: name, arg: leftover };
        }

        async function executePickedSlash(name) {
            const cmd = commandFromPicker(name);
            els.input.value = '';
            hideSlashPicker();
            await runSlash(cmd);
        }

        function cancelRename() {
            state.renaming = false;
            els.threadEdit.hidden = true;
            els.threadEdit.value = '';
            els.threadSelect.hidden = false;
        }

        function startRename() {
            const thread = currentThread();
            if (!thread) {
                return;
            }
            state.renaming = true;
            els.threadSelect.hidden = true;
            els.threadEdit.hidden = false;
            els.threadEdit.value = thread.label || '';
            els.threadEdit.focus();
            els.threadEdit.select();
        }

        async function saveRename() {
            if (!state.renaming || !state.threadId) {
                cancelRename();
                return;
            }
            const label = els.threadEdit.value;
            cancelRename();
            const res = await jPulse.api.put(`/api/1/ai/thread/${encodeURIComponent(state.threadId)}`, { label: label });
            if (!res.success) {
                showToast(res.error || I18N.error, 'error');
                return;
            }
            await refreshThreads();
        }

        async function createNew() {
            const res = await jPulse.api.post('/api/1/ai/thread', {
                scopeType: scopeType,
                scopeId: scopeId,
                label: '',
                forceNew: true
            });
            if (!res.success) {
                showToast(res.error || I18N.error, 'error');
                return;
            }
            await clearAttachments();
            await refreshThreads();
            await openThread(res.data._id);
        }

        async function cancelTurn() {
            if (!state.threadId) {
                return;
            }
            await jPulse.api.post(`/api/1/ai/thread/${encodeURIComponent(state.threadId)}/cancel`);
        }

        async function sendText(text, script) {
            els.slash.hidden = true;
            const threadId = await ensureThread();
            setRunning(true);
            state.streaming = '';
            state.pendingUser = text;
            showNotice('', false);
            await renderTurns();
            const body = { text: text };
            if (state.sources.length) {
                body.sources = state.sources.map(sourceMeta);
            }
            if (state.images.length) {
                const chosen = ((state.capability && state.capability.models) || []).find((row) => {
                    return row.provider === (state.selectedProvider || (state.capability.defaultModel && state.capability.defaultModel.provider))
                        && row.model === (state.selectedModel || (state.capability.defaultModel && state.capability.defaultModel.model));
                });
                if (chosen && chosen.available === false && chosen.reason === 'vision') {
                    showToast(I18N.visionGated, 'warning');
                    setRunning(false);
                    state.pendingUser = '';
                    state.streaming = '';
                    await renderTurns();
                    return;
                }
                body.images = state.images.map(imageMeta);
            }
            if (state.selectedProvider && state.selectedModel) {
                body.provider = state.selectedProvider;
                body.model = state.selectedModel;
            }
            if (typeof adapter.describeContext === 'function') {
                body.context = adapter.describeContext(hasContextOptions() ? contextGet() : undefined);
            } else if (hasContextOptions()) {
                const selected = readContextOptions().find((row) => row.value === contextGet());
                body.context = selected ? selected.label : contextGet();
            }
            if (typeof adapter.describeTarget === 'function') {
                body.target = adapter.describeTarget();
            }
            if (script) {
                body.script = script;
            }
            try {
                await transport.startTurn(threadId, body);
            } catch (error) {
                setRunning(false);
                showToast(error.message || I18N.error, 'error');
                await renderTurns();
            }
        }

        transport.on((event) => {
            if (!event || !event.type) {
                return;
            }
            if (event.type === 'text_delta') {
                state.streaming += event.text || '';
                renderTurns();
                return;
            }
            if (event.type === 'reconnecting') {
                showNotice(I18N.reconnecting, true);
                return;
            }
            if (event.type === 'connected') {
                if (els.notice.textContent === I18N.reconnecting) {
                    showNotice(state.running ? I18N.running : '', state.running);
                }
                return;
            }
            if (event.type === 'turn_start') {
                setRunning(true);
                renderTurns();
                return;
            }
            if (event.type === 'completed' || event.type === 'canceled' || event.type === 'stalled' || event.type === 'error') {
                setRunning(false);
                if (event.type === 'error') {
                    showToast(event.message || I18N.error, 'error');
                }
                showNotice('', false);
                emitRegionEvent('turn');
                openThread(state.threadId, { keepLocals: true });
            }
        });

        function findTurnProposal(turnId, proposalId) {
            const turn = state.turns.find((row) => String(row._id) === String(turnId));
            const proposal = ((turn && turn.proposals) || []).find((row) => row.id === proposalId);
            return { turn, proposal };
        }

        async function runApply(turn, proposal) {
            if (!turn || !proposal || !cardApplyState(proposal).ok) {
                return false;
            }
            state.cardBusy[proposal.id] = true;
            try {
                if (typeof adapter.applyProposal !== 'function') {
                    stampProposal(turn._id, proposal.id, { error: I18N.cardFailed });
                    return false;
                }
                const result = await adapter.applyProposal(proposal);
                if (!result) {
                    stampProposal(turn._id, proposal.id, { error: I18N.cardFailed });
                    return false;
                }
                const res = await jPulse.api.post(`/api/1/ai/turn/${encodeURIComponent(turn._id)}/applied`, {
                    proposalId: proposal.id
                });
                if (!res.success) {
                    stampProposal(turn._id, proposal.id, { error: res.error || I18N.cardFailed });
                    return false;
                }
                stampProposal(turn._id, proposal.id, { applied: true, undone: false, error: '' });
                return true;
            } catch (error) {
                stampProposal(turn._id, proposal.id, { error: error.message || I18N.cardFailed });
                return false;
            } finally {
                delete state.cardBusy[proposal.id];
            }
        }

        async function runUndo(turn, proposal) {
            if (!turn || !proposal || !proposal.applied || proposal.undone) {
                return false;
            }
            state.cardBusy[proposal.id] = true;
            try {
                if (typeof adapter.undoProposal !== 'function') {
                    stampProposal(turn._id, proposal.id, { error: I18N.cardFailed });
                    return false;
                }
                const result = await adapter.undoProposal(proposal);
                if (!result) {
                    stampProposal(turn._id, proposal.id, { error: I18N.cardFailed });
                    return false;
                }
                const res = await jPulse.api.post(`/api/1/ai/turn/${encodeURIComponent(turn._id)}/undone`, {
                    proposalId: proposal.id
                });
                if (!res.success) {
                    stampProposal(turn._id, proposal.id, { error: res.error || I18N.cardFailed });
                    return false;
                }
                stampProposal(turn._id, proposal.id, { undone: true, error: '' });
                return true;
            } catch (error) {
                stampProposal(turn._id, proposal.id, { error: error.message || I18N.cardFailed });
                return false;
            } finally {
                delete state.cardBusy[proposal.id];
            }
        }

        els.messages.addEventListener('click', async (event) => {
            const applyAll = event.target.closest('[data-ai-apply-all]');
            const applyBtn = event.target.closest('[data-ai-apply]');
            const undoBtn = event.target.closest('[data-ai-undo]');
            if (!applyAll && !applyBtn && !undoBtn) {
                return;
            }
            event.preventDefault();
            if (applyAll) {
                const turn = state.turns.find((row) => String(row._id) === applyAll.getAttribute('data-ai-apply-all'));
                const pending = ((turn && turn.proposals) || []).filter((card) => cardApplyState(card).ok);
                for (const proposal of pending) {
                    const ok = await runApply(turn, proposal);
                    if (!ok) {
                        break;
                    }
                }
                await renderTurns();
                return;
            }
            const cardEl = event.target.closest('[data-ai-card]');
            if (!cardEl) {
                return;
            }
            const found = findTurnProposal(cardEl.getAttribute('data-turn-id'), cardEl.getAttribute('data-proposal-id'));
            if (applyBtn) {
                await runApply(found.turn, found.proposal);
            } else if (undoBtn) {
                await runUndo(found.turn, found.proposal);
            }
            await renderTurns();
        });

        els.send.addEventListener('click', async () => {
            const raw = els.input.value;
            const trimmed = raw.trim();
            if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
                const matches = filterSlashCommands(trimmed, catalog, commandCtx());
                if (matches.length) {
                    const picked = matches[state.slashHighlight] || matches[0];
                    await executePickedSlash(picked.name);
                    return;
                }
                els.input.value = '';
                hideSlashPicker();
                await appendLocal(trimmed, I18N.slashUnknown);
                return;
            }
            const parsed = parseSlashCommand(trimmed, catalog, commandCtx());
            const text = parsed && parsed.kind === 'literal' ? parsed.text : raw;
            if (!String(text || '').trim()) {
                return;
            }
            els.input.value = '';
            hideSlashPicker();
            const url = extractPromptUrl(text);
            const cap = state.capability || {};
            if (url && cap.urlIngestEnabled !== false && cap.sourcesEnabled !== false) {
                showIntercept(url, text);
                return;
            }
            await sendText(text);
        });
        els.input.addEventListener('input', updateSlashPicker);
        els.input.addEventListener('keydown', (event) => {
            const matches = filterSlashCommands(els.input.value, catalog, commandCtx());
            const pickerOpen = !els.slash.hidden && matches.length > 0;
            if (event.key === 'ArrowDown' && pickerOpen) {
                event.preventDefault();
                state.slashHighlight = (state.slashHighlight + 1) % matches.length;
                renderSlashPicker();
                return;
            }
            if (event.key === 'ArrowUp' && pickerOpen) {
                event.preventDefault();
                state.slashHighlight = (state.slashHighlight - 1 + matches.length) % matches.length;
                renderSlashPicker();
                return;
            }
            if (event.key === 'Escape') {
                if (pickerOpen) {
                    event.preventDefault();
                    event.stopPropagation();
                    hideSlashPicker();
                }
                return;
            }
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                els.send.click();
            }
        });
        els.slash.addEventListener('click', async (event) => {
            const item = event.target.closest('.plg-ai-slash-item');
            if (!item) {
                return;
            }
            await executePickedSlash(item.getAttribute('data-name'));
        });
        function hideAddMenu() {
            if (els.addMenu) {
                els.addMenu.hidden = true;
                els.addMenu.style.left = '';
                els.addMenu.style.right = '';
            }
            if (els.add) {
                els.add.setAttribute('aria-expanded', 'false');
            }
        }

        function hideChipMenus(except) {
            if (!els.chips) {
                return;
            }
            els.chips.querySelectorAll('.plg-ai-chip-menu').forEach((menu) => {
                if (except && menu === except) {
                    return;
                }
                menu.hidden = true;
                menu.style.left = '';
                menu.style.right = '';
                const more = menu.parentNode && menu.parentNode.querySelector('.plg-ai-chip-more');
                if (more) {
                    more.setAttribute('aria-expanded', 'false');
                }
            });
        }

        function positionChipMenu(menu, more) {
            if (!menu || !more) {
                return;
            }
            const clip = (root.closest && root.closest('.jp-float-panel')) || root;
            const clipRect = clip.getBoundingClientRect();
            const moreRect = more.getBoundingClientRect();
            const onRight = moreRect.left + moreRect.width / 2 >= clipRect.left + clipRect.width / 2;
            if (onRight) {
                menu.style.left = 'auto';
                menu.style.right = '0px';
            } else {
                menu.style.left = '0px';
                menu.style.right = 'auto';
            }
        }

        function toggleChipMenu(more) {
            const wrap = more && more.closest('.plg-ai-chip-more-wrap');
            const menu = wrap && wrap.querySelector('.plg-ai-chip-menu');
            if (!menu) {
                return;
            }
            const open = menu.hidden;
            hideChipMenus(menu);
            hideAddMenu();
            menu.hidden = !open;
            more.setAttribute('aria-expanded', open ? 'true' : 'false');
            if (open) {
                const id = more.getAttribute('data-chip-more');
                const row = attachmentRow(id);
                const gate = attachGate(row);
                const item = menu.querySelector('[data-chip-attach]');
                if (item) {
                    item.disabled = !gate.ok;
                    if (gate.ok) {
                        item.removeAttribute('title');
                    } else {
                        item.title = gate.reason || I18N.chipAttachBlocked;
                    }
                }
                positionChipMenu(menu, more);
                if (jPulse.UI && jPulse.UI.tooltip && typeof jPulse.UI.tooltip.closeActive === 'function') {
                    jPulse.UI.tooltip.closeActive();
                }
            } else {
                menu.style.left = '';
                menu.style.right = '';
            }
        }

        async function runChipAttach(id) {
            hideChipMenus();
            const row = attachmentRow(id);
            if (!row || typeof adapter.attach !== 'function') {
                return;
            }
            const gate = attachGate(row);
            if (!gate.ok) {
                showToast(gate.reason || I18N.chipAttachBlocked, 'error');
                return;
            }
            try {
                const ok = await adapter.attach(row, handle.attachmentFile(row.id));
                if (!ok) {
                    showToast(I18N.error, 'error');
                }
            } catch (error) {
                showToast(error.message || I18N.error, 'error');
            }
        }

        function positionAddMenu() {
            if (!els.addMenu || !els.add) {
                return;
            }
            const clip = (root.closest && root.closest('.jp-float-panel')) || root;
            const clipRect = clip.getBoundingClientRect();
            const addRect = els.add.getBoundingClientRect();
            const onRight = addRect.left + addRect.width / 2 >= clipRect.left + clipRect.width / 2;
            if (onRight) {
                els.addMenu.style.left = 'auto';
                els.addMenu.style.right = '0px';
            } else {
                els.addMenu.style.left = '0px';
                els.addMenu.style.right = 'auto';
            }
        }

        function toggleAddMenu() {
            if (!els.addMenu) {
                return;
            }
            const open = els.addMenu.hidden;
            hideChipMenus();
            els.addMenu.hidden = !open;
            if (els.add) {
                els.add.setAttribute('aria-expanded', open ? 'true' : 'false');
            }
            if (open) {
                positionAddMenu();
                if (jPulse.UI && jPulse.UI.tooltip && typeof jPulse.UI.tooltip.closeActive === 'function') {
                    jPulse.UI.tooltip.closeActive();
                }
            } else {
                els.addMenu.style.left = '';
                els.addMenu.style.right = '';
            }
        }

        if (els.add) {
            els.add.addEventListener('click', (event) => {
                event.stopPropagation();
                toggleAddMenu();
            });
        }
        if (els.addFile) {
            els.addFile.addEventListener('click', () => {
                hideAddMenu();
                if (els.file) {
                    els.file.click();
                }
            });
        }
        if (els.file) {
            els.file.addEventListener('change', async () => {
                const files = Array.from(els.file.files || []);
                els.file.value = '';
                for (const file of files) {
                    await addDroppedFile(file);
                }
            });
        }
        async function promptUrl() {
            if (jPulse.UI && typeof jPulse.UI.confirmDialog === 'function') {
                let value = '';
                const result = await jPulse.UI.confirmDialog({
                    title: I18N.stripUrl,
                    message: `<label class="jp-label" for="plg-ai-url-field">${escapeHtml(I18N.stripUrl)}</label>`
                        + '<input id="plg-ai-url-field" type="url" class="jp-form-input plg-ai-url-field" value="https://">',
                    buttons: {
                        [I18N.cancel]: function () {
                            return false;
                        },
                        [I18N.stripUrl]: function (dialog) {
                            const input = dialog.querySelector('.plg-ai-url-field');
                            value = String((input && input.value) || '').trim();
                            if (!value || value === 'https://') {
                                return { dontClose: true };
                            }
                        }
                    },
                    onOpen: function (dialog) {
                        const input = dialog.querySelector('.plg-ai-url-field');
                        if (!input) {
                            return;
                        }
                        input.focus();
                        input.select();
                        input.addEventListener('keydown', function (event) {
                            if (event.key === 'Enter') {
                                event.preventDefault();
                                const go = dialog.querySelector('.jp-dialog-btn-default');
                                if (go) {
                                    go.click();
                                }
                            }
                        });
                    }
                });
                if (!result || result.cancelled || result.button === I18N.cancel) {
                    return '';
                }
                return value;
            }
            return String(window.prompt(I18N.stripUrl, 'https://') || '').trim();
        }

        if (els.addUrl) {
            els.addUrl.addEventListener('click', async () => {
                hideAddMenu();
                const url = await promptUrl();
                if (url) {
                    await fetchUrlSource(url);
                }
            });
        }
        function onDocumentClick(event) {
            const target = event.target;
            if (els.addMenu && !els.addMenu.hidden
                && !(target.closest && target.closest('.plg-ai-strip-add'))) {
                hideAddMenu();
            }
            if (!(target.closest && target.closest('.plg-ai-chip-more-wrap'))) {
                hideChipMenus();
            }
            if (els.chipPop && !els.chipPop.hidden
                && !(target.closest && (target.closest('.plg-ai-chip-pop') || target.closest('.plg-ai-chip')))) {
                hideChipPop();
            }
        }
        function onDocumentKeydown(event) {
            if (event.key === 'Escape') {
                hideAddMenu();
                hideChipMenus();
                hideChipPop();
            }
        }
        document.addEventListener('click', onDocumentClick);
        document.addEventListener('keydown', onDocumentKeydown);
        if (els.chips) {
            els.chips.addEventListener('click', (event) => {
                const moreBtn = event.target.closest('[data-chip-more]');
                if (moreBtn) {
                    event.stopPropagation();
                    toggleChipMenu(moreBtn);
                    return;
                }
                const attachBtn = event.target.closest('[data-chip-attach]');
                if (attachBtn) {
                    event.stopPropagation();
                    if (attachBtn.disabled) {
                        return;
                    }
                    runChipAttach(attachBtn.getAttribute('data-chip-attach'));
                    return;
                }
                const removeSrc = event.target.closest('[data-remove]');
                const removeImg = event.target.closest('[data-remove-img]');
                if (removeSrc) {
                    const id = removeSrc.getAttribute('data-remove');
                    state.sources = state.sources.filter((row) => row.id !== id);
                    panelStore.files.delete(id);
                    hideChipPop();
                    syncStore();
                    renderStrip();
                    refreshCapability();
                    return;
                }
                if (removeImg) {
                    const id = removeImg.getAttribute('data-remove-img');
                    state.images = state.images.filter((row) => row.id !== id);
                    panelStore.files.delete(id);
                    hideChipPop();
                    syncStore();
                    renderStrip();
                    refreshCapability();
                    if (state.threadId && id) {
                        jPulse.api.delete(
                            `/api/1/ai/thread/${encodeURIComponent(state.threadId)}/image/${encodeURIComponent(id)}`
                        ).catch(() => {});
                    }
                    return;
                }
                const srcChip = event.target.closest('[data-src]');
                const imgChip = event.target.closest('[data-img]');
                if (srcChip) {
                    showChipPop(srcChip.getAttribute('data-src'), 'src');
                    return;
                }
                if (imgChip) {
                    showChipPop(imgChip.getAttribute('data-img'), 'img');
                }
            });
        }
        if (els.chipPop) {
            els.chipPop.addEventListener('click', async (event) => {
                const copyBtn = event.target.closest('[data-copy]');
                if (!copyBtn) {
                    return;
                }
                const text = copyBtn.getAttribute('data-copy') || '';
                try {
                    await navigator.clipboard.writeText(text);
                    copyBtn.textContent = I18N.copied;
                    setTimeout(() => {
                        copyBtn.textContent = I18N.copy;
                    }, 1200);
                } catch (_err) {
                    copyBtn.textContent = I18N.error;
                }
            });
        }
        if (els.intercept) {
            els.intercept.addEventListener('click', async (event) => {
                if (event.target.closest('[data-ai-fetch]')) {
                    const pending = state.intercept;
                    hideIntercept();
                    if (pending) {
                        await fetchUrlSource(pending.url);
                        await sendText(pending.text);
                    }
                    return;
                }
                if (event.target.closest('[data-ai-skip]')) {
                    const pending = state.intercept;
                    hideIntercept();
                    if (pending) {
                        await sendText(pending.text);
                    }
                    return;
                }
                if (event.target.closest('[data-ai-cancel-fetch]')) {
                    const pending = state.intercept;
                    hideIntercept();
                    if (pending) {
                        els.input.value = pending.text;
                    }
                }
            });
        }
        let dragDepth = 0;
        let dropFlashTimer = 0;

        function setDropMode(mode) {
            if (!els.compose) {
                return;
            }
            els.compose.classList.toggle('plg-ai-drop--ok', mode === 'ok');
            els.compose.classList.toggle('plg-ai-drop--no', mode === 'no');
        }

        function clearDropMode() {
            dragDepth = 0;
            setDropMode('');
        }

        function flashDropRefuse() {
            setDropMode('no');
            if (dropFlashTimer) {
                clearTimeout(dropFlashTimer);
            }
            dropFlashTimer = setTimeout(() => {
                dropFlashTimer = 0;
                if (dragDepth === 0) {
                    setDropMode('');
                }
            }, 450);
        }

        function dragHasFiles(event) {
            const types = event.dataTransfer && event.dataTransfer.types;
            if (!types) {
                return false;
            }
            return Array.prototype.indexOf.call(types, 'Files') >= 0;
        }

        function dragItemsMode(event) {
            const items = event.dataTransfer && event.dataTransfer.items;
            if (!items || !items.length) {
                return 'ok';
            }
            let knownOk = false;
            let knownNo = false;
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                if (item.kind && item.kind !== 'file') {
                    continue;
                }
                const type = String(item.type || '');
                if (!type) {
                    continue;
                }
                if (classifyFile({ name: '', type: type }).ok) {
                    knownOk = true;
                } else {
                    knownNo = true;
                }
            }
            if (knownNo && !knownOk) {
                return 'no';
            }
            return 'ok';
        }

        root.addEventListener('dragenter', (event) => {
            if (!dragHasFiles(event)) {
                return;
            }
            event.preventDefault();
            dragDepth += 1;
            setDropMode(dragItemsMode(event));
        });
        root.addEventListener('dragover', (event) => {
            if (!dragHasFiles(event)) {
                return;
            }
            event.preventDefault();
            const mode = dragItemsMode(event);
            if (event.dataTransfer) {
                event.dataTransfer.dropEffect = mode === 'no' ? 'none' : 'copy';
            }
            setDropMode(mode);
        });
        root.addEventListener('dragleave', (event) => {
            if (!dragHasFiles(event)) {
                return;
            }
            dragDepth = Math.max(0, dragDepth - 1);
            if (dragDepth === 0) {
                setDropMode('');
            }
        });
        root.addEventListener('drop', async (event) => {
            event.preventDefault();
            clearDropMode();
            const files = Array.from((event.dataTransfer && event.dataTransfer.files) || []);
            for (const file of files) {
                await addDroppedFile(file);
            }
        });
        els.input.addEventListener('paste', async (event) => {
            const files = Array.from((event.clipboardData && event.clipboardData.files) || []);
            if (!files.length) {
                return;
            }
            event.preventDefault();
            for (const file of files) {
                await addDroppedFile(file, { origin: 'paste' });
            }
        });
        if (els.contextSelect) {
            els.contextSelect.addEventListener('change', () => {
                contextSet(els.contextSelect.value);
            });
        }
        els.cancel.addEventListener('click', cancelTurn);
        els.newer.addEventListener('click', async () => {
            if (!(await confirmDropAttachments())) {
                return;
            }
            await createNew();
        });
        els.rename.addEventListener('click', startRename);
        els.threadSelect.addEventListener('change', async () => {
            const id = els.threadSelect.value;
            if (!id) {
                return;
            }
            if (!(await confirmDropAttachmentsForSwitch(id))) {
                els.threadSelect.value = state.threadId;
                return;
            }
            await openThread(id);
        });
        els.threadEdit.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                event.stopPropagation();
                saveRename();
                return;
            }
            if (event.key === 'Escape') {
                event.preventDefault();
                event.stopPropagation();
                cancelRename();
            }
        });
        els.threadEdit.addEventListener('blur', () => {
            if (state.renaming) {
                saveRename();
            }
        });

        (async () => {
            try {
                const capability = await refreshCapability();
                state.capability = capability;
                applyThreadModel(currentThread());
                if (capability.retentionDays) {
                    showNotice(fillToken(I18N.retention, '%DAYS%', String(capability.retentionDays)), true);
                }
                await refreshThreads();
                if (state.threadId) {
                    await openThread(state.threadId);
                } else if (state.threads[0]) {
                    await openThread(state.threads[0]._id);
                } else {
                    loadThreadContext();
                }
                refreshRegions();
            } catch (error) {
                showToast(error.message || I18N.loadError, 'error');
            }
        })();

        const floatDestroy = handle && typeof handle.destroy === 'function'
            ? handle.destroy.bind(handle)
            : null;
        let destroyed = false;
        function destroy() {
            if (destroyed) {
                return;
            }
            destroyed = true;
            if (state.running && state.threadId) {
                jPulse.api.post(`/api/1/ai/thread/${encodeURIComponent(state.threadId)}/cancel`).catch(function () {});
            }
            if (transport && typeof transport.disconnect === 'function') {
                transport.disconnect();
            }
            document.removeEventListener('click', onDocumentClick);
            document.removeEventListener('keydown', onDocumentKeydown);
            if (launcherEl && typeof launcherEl.removeEventListener === 'function') {
                launcherEl.removeEventListener('click', onLauncherClick);
            }
            if (floatDestroy) {
                floatDestroy();
            }
            if (root && root.parentNode) {
                root.parentNode.removeChild(root);
            }
        }
        function setTitle(value) {
            const next = (typeof value === 'string' && value.trim())
                ? value.trim()
                : I18N.title;
            const titleEl = root.querySelector('.plg-ai-title');
            if (titleEl) {
                titleEl.textContent = next;
            }
            if (els.threadSelect) {
                els.threadSelect.setAttribute('aria-label', next);
            }
        }
        const panelApi = {
            handle: handle,
            root: root,
            transport: transport,
            send: sendText,
            parseSlashCommand: parseSlashCommand,
            filterSlashCommands: filterSlashCommands,
            attachments: function () {
                return state.sources.map(sourceMeta).concat(state.images.map(imageMeta));
            },
            attachmentFile: function (id) {
                return panelStore.files.get(id) || null;
            },
            destroy: destroy,
            setTitle: setTitle
        };
        if (handle) {
            handle.attachments = panelApi.attachments;
            handle.attachmentFile = panelApi.attachmentFile;
            handle.destroy = destroy;
            handle.setTitle = setTitle;
            handle.regions = {
                refresh: refreshRegions
            };
            handle.context = {
                get: contextGet,
                set: function (value) {
                    contextSet(value);
                },
                refresh: function () {
                    const rows = readContextOptions();
                    const match = rows.find((row) => row.value === state.contextValue);
                    if (!match) {
                        state.contextValue = firstAvailableContext(rows);
                    }
                    renderContextRow();
                }
            };
        }
        return panelApi;
    }

    window.jPulse.ai = {
        parseSlashCommand: parseSlashCommand,
        filterSlashCommands: filterSlashCommands,
        parseModelArg: parseModelArg,
        parseExampleRow: parseExampleRow,
        loadToolModule: loadToolModule,
        commands: {
            defaults: COMMAND_DEFAULTS.slice(),
            normalizeCatalog: normalizeCatalog,
            parseSlashCommand: parseSlashCommand,
            filterSlashCommands: filterSlashCommands,
            parseExampleRow: parseExampleRow
        },
        transport: {
            create: createTransport
        },
        panel: {
            create: createPanel
        }
    };
}());

// EOF plugins/ai-core/webapp/view/jpulse-common.js
