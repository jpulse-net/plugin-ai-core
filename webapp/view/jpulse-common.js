/*
 * @name            jPulse Framework / Plugins / AI Core / WebApp / View / jPulse Common JavaScript
 * @tagline         jPulse.ai client: panel, transport, tool modules
 * @description     Appended to the framework jpulse-common.js (W-098)
 * @file            plugins/ai-core/webapp/view/jpulse-common.js
 * @version         1.0.2
 * @release         2026-09-17
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
        slashHost: '{{i18n.view.ui.ai.slash.host}}',
        slashWithheld: '{{i18n.view.ui.ai.slash.withheld}}',
        slashReason: '{{i18n.view.ui.ai.slash.reason}}',
        slashNone: '{{i18n.view.ui.ai.slash.none}}',
        slashUnknown: '{{i18n.view.ui.ai.slash.unknown}}',
        slashExamples: '{{i18n.view.ui.ai.slash.examples}}'
    };
    const SLASH_COMMANDS = ['help', 'tools', 'model', 'new', 'cancel'];
    const RESULT_SIZE_CAP = 256 * 1024;
    const loadedModules = new Map();
    let markedPromise = null;

    function escapeHtml(value) {
        return jPulse.string && jPulse.string.escapeHtml
            ? jPulse.string.escapeHtml(String(value == null ? '' : value))
            : String(value == null ? '' : value)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;');
    }

    function parseSlashCommand(text) {
        const raw = String(text || '');
        if (raw.startsWith('//')) {
            return { kind: 'literal', text: raw.slice(1) };
        }
        const match = raw.match(/^\/([a-z]+)(?:\s+([\s\S]+))?$/i);
        if (!match) {
            return null;
        }
        const name = match[1].toLowerCase();
        if (SLASH_COMMANDS.indexOf(name) < 0) {
            return null;
        }
        return { kind: 'command', name: name, arg: (match[2] || '').trim() };
    }

    function filterSlashCommands(text) {
        const raw = String(text || '');
        if (!raw.startsWith('/') || raw.startsWith('//')) {
            return [];
        }
        const rest = raw.slice(1);
        const space = rest.search(/\s/);
        const typed = (space < 0 ? rest : rest.slice(0, space)).toLowerCase();
        return SLASH_COMMANDS.filter((name) => name.startsWith(typed));
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

        async function probe() {
            const query = new URLSearchParams({
                scopeType: options.scopeType || '',
                scopeId: options.scopeId || ''
            });
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

        function waitForWs(conn) {
            if (conn.isConnected && conn.isConnected()) {
                return Promise.resolve();
            }
            return new Promise((resolve, reject) => {
                let settled = false;
                const timer = setTimeout(() => {
                    if (!settled) {
                        settled = true;
                        reject(new Error(I18N.reconnecting));
                    }
                }, 15000);
                conn.onStatusChange((status) => {
                    if (settled) {
                        return;
                    }
                    if (status === 'connected') {
                        settled = true;
                        clearTimeout(timer);
                        resolve();
                        return;
                    }
                    if (status === 'auth-required') {
                        settled = true;
                        clearTimeout(timer);
                        reject(new Error(I18N.error));
                    }
                });
            });
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
                        const toolData = typeof adapter.toolData === 'function'
                            ? await adapter.toolData(data.name)
                            : {};
                        result = await mod.run(toolData, data.args || {});
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

        async function connectWs(threadId) {
            const path = `/api/1/ws/ai/${threadId}`;
            if (wsConn && wsConn.path === path) {
                await waitForWs(wsConn);
                return wsConn;
            }
            if (wsConn) {
                const previous = wsConn;
                previous._aiIgnoreStatus = true;
                if (typeof previous.disconnect === 'function') {
                    previous.disconnect();
                }
            }
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
            await waitForWs(conn);
            emitAll(listeners, { type: 'connected' });
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
                if (!wsConn.send({ type: 'turn', data: body })) {
                    emitAll(listeners, { type: 'error', message: I18N.error });
                }
                return;
            }
            await startHttpTurn(threadId, body);
        }

        return {
            on: on,
            probe: probe,
            startTurn: startTurn,
            connectWs: connectWs,
            getCapability: () => capability
        };
    }

    function createPanel(options) {
        const scopeType = options.scopeType || '';
        const scopeId = String(options.scopeId || '');
        const adapter = options.adapter || {};
        const panelId = options.id || `ai-panel-${scopeType}-${scopeId}`;
        const threadKey = `jp:ai:thread:${scopeType}:${scopeId}`;
        const transport = createTransport({
            scopeType: scopeType,
            scopeId: scopeId,
            adapter: adapter
        });
        const root = document.createElement('div');
        root.className = 'plg-ai-panel';
        root.innerHTML = [
            '<div class="plg-ai-toolbar" data-jp-panel-drag>',
            `  <strong class="plg-ai-title">${escapeHtml(I18N.title)}</strong>`,
            `  <button type="button" class="plg-ai-close jp-float-panel-header-btn" data-jp-panel-close aria-label="×">×</button>`,
            '</div>',
            '<div class="plg-ai-thread-row">',
            `  <select class="plg-ai-thread-select jp-form-select" aria-label="${escapeHtml(I18N.title)}"></select>`,
            `  <input type="text" class="plg-ai-thread-edit jp-form-input" hidden aria-label="${escapeHtml(I18N.rename)}">`,
            `  <button type="button" class="plg-ai-rename jp-btn jp-btn-sm" title="${escapeHtml(I18N.rename)}" aria-label="${escapeHtml(I18N.rename)}">`,
            '    <svg class="plg-ai-icon" viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M11.6 1.6a1.2 1.2 0 0 1 1.7 0l1.1 1.1a1.2 1.2 0 0 1 0 1.7l-8.2 8.2L3 14l1.4-3.2 8.2-8.2z"/></svg>',
            '  </button>',
            `  <button type="button" class="plg-ai-new jp-btn jp-btn-sm" title="${escapeHtml(I18N.newConversation)}" aria-label="${escapeHtml(I18N.newConversation)}">`,
            '    <svg class="plg-ai-icon" viewBox="0 0 16 16" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" d="M8 3v10M3 8h10"/></svg>',
            '  </button>',
            '</div>',
            '<div class="plg-ai-notice" hidden></div>',
            '<div class="plg-ai-messages"></div>',
            '<div class="plg-ai-compose">',
            '  <div class="plg-ai-slash" hidden></div>',
            `  <textarea class="plg-ai-input jp-form-textarea" rows="3" placeholder="${escapeHtml(I18N.composePlaceholder)}"></textarea>`,
            '  <div class="plg-ai-actions">',
            `    <button type="button" class="plg-ai-send jp-btn jp-btn-primary">${escapeHtml(I18N.send)}</button>`,
            `    <button type="button" class="plg-ai-cancel jp-btn" hidden>${escapeHtml(I18N.cancel)}</button>`,
            '  </div>',
            '</div>'
        ].join('');

        if (!root.parentNode && document.body) {
            document.body.appendChild(root);
        }
        const handle = jPulse.UI.floatPanel.create({
            id: panelId,
            el: root,
            defaults: { w: 420, h: 560, open: !!options.open },
            minWidth: 320,
            minHeight: 360,
            launcher: options.launcher
        });
        const launcherEl = typeof options.launcher === 'string'
            ? document.querySelector(options.launcher)
            : options.launcher;
        if (handle && launcherEl && typeof launcherEl.addEventListener === 'function') {
            launcherEl.addEventListener('click', () => {
                if (typeof handle.toggle === 'function') {
                    handle.toggle();
                    return;
                }
                if (handle.isOpen && handle.isOpen()) {
                    handle.close();
                    return;
                }
                handle.open();
            });
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
            renaming: false
        };

        const els = {
            messages: root.querySelector('.plg-ai-messages'),
            notice: root.querySelector('.plg-ai-notice'),
            slash: root.querySelector('.plg-ai-slash'),
            input: root.querySelector('.plg-ai-input'),
            send: root.querySelector('.plg-ai-send'),
            cancel: root.querySelector('.plg-ai-cancel'),
            threadSelect: root.querySelector('.plg-ai-thread-select'),
            threadEdit: root.querySelector('.plg-ai-thread-edit'),
            rename: root.querySelector('.plg-ai-rename'),
            newer: root.querySelector('.plg-ai-new')
        };

        function showNotice(text, visible) {
            els.notice.hidden = !visible;
            els.notice.textContent = text || '';
        }

        function setRunning(running) {
            state.running = running;
            els.cancel.hidden = !running;
            els.send.disabled = running;
        }

        async function refreshThreads() {
            const query = new URLSearchParams({
                scopeType: scopeType,
                scopeId: scopeId,
                limit: '20'
            });
            const res = await jPulse.api.get(`/api/1/ai/thread?${query.toString()}`);
            if (!res.success) {
                showNotice(I18N.loadError, true);
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
            return `<div class="plg-ai-plain">${escapeHtml(text || '')}</div>`;
        }

        function entryTime(value, fallback) {
            if (!value) {
                return fallback;
            }
            const ms = new Date(value).getTime();
            return Number.isFinite(ms) ? ms : fallback;
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
                parts.push(`<article class="plg-ai-turn"><div class="plg-ai-user">${escapeHtml(userText)}</div>`);
            } else {
                parts.push('<article class="plg-ai-turn">');
            }
            if (agentText) {
                parts.push(`<div class="plg-ai-agent">${await renderMarkdown(agentText)}</div></article>`);
            } else if (err) {
                parts.push(`<div class="plg-ai-agent">${renderPlain(err)}</div></article>`);
            } else {
                parts.push('</article>');
            }
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
            const html = [];
            for (const item of items) {
                if (item.kind === 'local') {
                    html.push(`<article class="plg-ai-turn plg-ai-turn--local"><div class="plg-ai-user">${escapeHtml(item.local.userText || '')}</div>`);
                    html.push(`<div class="plg-ai-agent">${renderPlain(item.local.agentText)}</div></article>`);
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
            pinCopyButtons(els.messages);
            els.messages.scrollTop = els.messages.scrollHeight;
        }

        async function openThread(threadId, options) {
            const sameThread = String(threadId || '') === state.threadId;
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
                return;
            }
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

        function slashHelpLines() {
            const lines = [
                `/help — ${I18N.slashHelp}`,
                `/tools — ${I18N.slashTools}`,
                `/model — ${I18N.slashModel}`,
                `/new — ${I18N.slashNew}`,
                `/cancel — ${I18N.slashCancel}`
            ];
            const examples = Array.isArray(options.examples) ? options.examples : [];
            if (examples.length) {
                lines.push('', I18N.slashExamples);
                examples.forEach((row) => {
                    if (row) {
                        lines.push(String('- ' + row));
                    }
                });
            }
            return lines.join('\n');
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
                rows.push(`${I18N.slashWithheld} \`${row.name}\` · ${I18N.slashReason} ${row.reason || ''}`);
            });
            return rows.join('\n');
        }

        function modelOnMenu(pair) {
            const menu = (state.capability && state.capability.models) || [];
            return menu.some((row) => {
                return row.provider === pair.provider && row.model === pair.model && row.available !== false;
            });
        }

        function modelStatusText() {
            const cap = state.capability || {};
            const def = cap.defaultModel || {};
            const provider = state.selectedProvider || def.provider || '';
            const model = state.selectedModel || def.model || '';
            const isDefault = provider === def.provider && model === def.model;
            const lines = [
                `${I18N.provider}: ${provider || '—'}`,
                `${I18N.model}: ${model || '—'}${isDefault && model ? ` (${I18N.siteDefault})` : ''}`,
                '',
                I18N.available + ':'
            ];
            (cap.models || []).forEach((row) => {
                const pair = `${row.provider}/${row.model}`;
                const label = row.label && row.label !== pair ? ` — ${row.label}` : '';
                const off = row.available === false ? ' (off)' : '';
                lines.push(`/model ${pair}${label}${off}`);
            });
            return lines.join('\n');
        }

        function hideSlashPicker() {
            els.slash.hidden = true;
            els.slash.innerHTML = '';
            state.slashHighlight = 0;
        }

        function renderSlashPicker() {
            const matches = filterSlashCommands(els.input.value);
            if (!matches.length) {
                hideSlashPicker();
                return;
            }
            if (state.slashHighlight >= matches.length) {
                state.slashHighlight = 0;
            }
            const help = {
                help: I18N.slashHelp,
                tools: I18N.slashTools,
                model: I18N.slashModel,
                new: I18N.slashNew,
                cancel: I18N.slashCancel
            };
            els.slash.hidden = false;
            els.slash.innerHTML = matches.map((name, idx) => {
                const active = idx === state.slashHighlight ? ' plg-ai-slash-item--active' : '';
                return `<button type="button" class="plg-ai-slash-item${active}" data-name="${escapeHtml(name)}">/${escapeHtml(name)} — ${escapeHtml(help[name] || '')}</button>`;
            }).join('');
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

        async function appendLocal(userText, agentText) {
            state.locals.push({
                userText: userText,
                agentText: agentText,
                at: Date.now()
            });
            await renderTurns();
        }

        async function applySlash(cmd) {
            if (cmd.name === 'help') {
                return slashHelpLines();
            }
            if (cmd.name === 'tools') {
                return toolsText();
            }
            if (cmd.name === 'model') {
                if (!cmd.arg) {
                    return modelStatusText();
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
                return I18N.modelSet.replace('{{pair}}', `${pair.provider}/${pair.model}`)
                    + '\n\n' + modelStatusText();
            }
            if (cmd.name === 'new') {
                await createNew();
                return I18N.newConversation;
            }
            if (cmd.name === 'cancel') {
                await cancelTurn();
                return I18N.cancel;
            }
            return I18N.slashUnknown;
        }

        async function runSlash(cmd) {
            const reply = await applySlash(cmd);
            await appendLocal(slashDisplay(cmd), reply);
        }

        function commandFromPicker(name) {
            const parsed = parseSlashCommand(els.input.value.trim());
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
                showNotice(res.error || I18N.error, true);
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
                showNotice(res.error || I18N.error, true);
                return;
            }
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
            if (state.selectedProvider && state.selectedModel) {
                body.provider = state.selectedProvider;
                body.model = state.selectedModel;
            }
            if (typeof adapter.describeContext === 'function') {
                body.context = adapter.describeContext();
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
                showNotice(error.message || I18N.error, true);
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
                showNotice(event.type === 'error' ? (event.message || I18N.error) : '', event.type === 'error');
                openThread(state.threadId, { keepLocals: true });
            }
        });

        els.send.addEventListener('click', async () => {
            const raw = els.input.value;
            const trimmed = raw.trim();
            if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
                const matches = filterSlashCommands(trimmed);
                if (matches.length) {
                    await executePickedSlash(matches[state.slashHighlight] || matches[0]);
                    return;
                }
                els.input.value = '';
                hideSlashPicker();
                await appendLocal(trimmed, I18N.slashUnknown);
                return;
            }
            const parsed = parseSlashCommand(trimmed);
            const text = parsed && parsed.kind === 'literal' ? parsed.text : raw;
            if (!String(text || '').trim()) {
                return;
            }
            els.input.value = '';
            hideSlashPicker();
            await sendText(text);
        });
        els.input.addEventListener('input', updateSlashPicker);
        els.input.addEventListener('keydown', (event) => {
            const matches = filterSlashCommands(els.input.value);
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
        els.cancel.addEventListener('click', cancelTurn);
        els.newer.addEventListener('click', createNew);
        els.rename.addEventListener('click', startRename);
        els.threadSelect.addEventListener('change', async () => {
            const id = els.threadSelect.value;
            if (id) {
                await openThread(id);
            }
        });
        els.threadEdit.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
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
                const capability = await transport.probe();
                state.capability = capability;
                applyThreadModel(currentThread());
                if (capability.retentionDays) {
                    showNotice(I18N.retention.replace('{{days}}', String(capability.retentionDays)), true);
                }
                await refreshThreads();
                if (state.threadId) {
                    await openThread(state.threadId);
                } else if (state.threads[0]) {
                    await openThread(state.threads[0]._id);
                }
            } catch (error) {
                showNotice(error.message || I18N.loadError, true);
            }
        })();

        return {
            handle: handle,
            root: root,
            transport: transport,
            send: sendText,
            parseSlashCommand: parseSlashCommand,
            filterSlashCommands: filterSlashCommands
        };
    }

    window.jPulse.ai = {
        parseSlashCommand: parseSlashCommand,
        filterSlashCommands: filterSlashCommands,
        parseModelArg: parseModelArg,
        loadToolModule: loadToolModule,
        transport: {
            create: createTransport
        },
        panel: {
            create: createPanel
        }
    };
}());

// EOF plugins/ai-core/webapp/view/jpulse-common.js
