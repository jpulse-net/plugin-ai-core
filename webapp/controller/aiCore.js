/**
 * @name            jPulse Framework / Plugins / AI Core / WebApp / Controller / AI Core
 * @tagline         AI agent controller, hooks, and global.AiCore
 * @description     Defines the hook catalog, publishes AiCore, and serves HTTP/SSE turns
 * @file            plugins/ai-core/webapp/controller/aiCore.js
 * @version         1.0.0
 * @release         2026-09-17
 * @repository      https://github.com/jpulse-net/plugin-ai-core
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.20, Grok 4.6
 */

import {
    broadcastCancel,
    filterAllowedModels,
    firstExceededCap,
    listProviders,
    loadSettings,
    onAiQuotaCheck,
    onAiQuotaSettle,
    pickDefaultModel,
    quotaSnapshot,
    roleAllowed,
    runTurn,
    subscribeCancelBroadcast
} from '../utils/agent/index.js';
import AiThreadModel from '../model/aiThread.js';
import AiTurnModel from '../model/aiTurn.js';
import AiUsageModel from '../model/aiUsage.js';
import {
    actorFromRequest,
    onBehalfOfLogSuffix,
    registerTools,
    resolveTools,
    threadOwner
} from '../utils/tools/index.js';
import { chooseTransport, openSseTurn } from '../utils/transport/index.js';

const LogController = global.LogController;
const CommonUtils = global.CommonUtils;

function sendError(req, res, status, message, code) {
    if (CommonUtils?.sendError) {
        return CommonUtils.sendError(req, res, status, message, code);
    }
    return res.status(status).json({ success: false, error: message, code });
}

function logReq(req, method, actor, extra = '') {
    const suffix = onBehalfOfLogSuffix(actor);
    LogController?.logRequest?.(req, method, `${extra}${suffix}`.trim());
}

function logOk(req, method, actor, extra = '') {
    const suffix = onBehalfOfLogSuffix(actor);
    LogController?.logInfo?.(req, method, `success: ${extra}${suffix}`);
}

function logErr(req, method, actor, error) {
    const suffix = onBehalfOfLogSuffix(actor);
    LogController?.logError?.(req, method, `error: ${error.message}${suffix}`);
}

class AiCoreController {
    static hookDefinitions = {
        onAiProviderRegister: {
            description: 'Contribute a provider descriptor',
            mode: 'execute',
            onError: 'continue',
            canModify: true,
            contextKeys: ['providers'],
            since: '1.0.0'
        },
        onAiComplete: {
            description: 'Run one completion; emit normalized events',
            mode: 'executeForPlugin',
            onError: 'abort',
            canModify: true,
            contextKeys: ['threadId', 'model', 'system', 'messages', 'tools', 'emit', 'abortSignal', 'round'],
            since: '1.0.0'
        },
        onAiToolRegister: {
            description: 'Contribute tool descriptors',
            mode: 'execute',
            onError: 'continue',
            canModify: true,
            contextKeys: ['tools', 'actor'],
            since: '1.0.0'
        },
        onAiToolExecute: {
            description: 'Execute an owner\'s server-host tool',
            mode: 'executeForPlugin',
            onError: 'abort',
            canModify: true,
            contextKeys: ['tool', 'args', 'actor', 'scope', 'result'],
            since: '1.0.0'
        },
        onAiToolData: {
            description: 'Supply a shared tool module\'s data on the server',
            mode: 'executeFirst',
            onError: 'abort',
            canModify: true,
            contextKeys: ['tool', 'actor', 'data'],
            since: '1.0.0'
        },
        onAiScopeResolve: {
            description: 'Resolve scope, labels, and the actor\'s capabilities in it',
            mode: 'executeFirst',
            onError: 'abort',
            canModify: true,
            contextKeys: ['actor', 'scopeId', 'scopeType', 'scope'],
            since: '1.0.0'
        },
        onAiPromptFragment: {
            description: 'Contribute system-prompt fragments',
            mode: 'execute',
            onError: 'continue',
            canModify: true,
            contextKeys: ['fragments', 'actor', 'scope'],
            since: '1.0.0'
        },
        onAiQuotaCheck: {
            description: 'Resolve the subject and its caps, and reserve; veto by throwing',
            mode: 'executeFirst',
            onError: 'abort',
            canModify: true,
            contextKeys: ['actor', 'settings', 'quota'],
            since: '1.0.0'
        },
        onAiQuotaSettle: {
            description: 'Apply actual usage',
            mode: 'execute',
            onError: 'continue',
            canModify: true,
            contextKeys: ['actor', 'quota', 'usage'],
            since: '1.0.0'
        },
        onAiTurnBefore: {
            description: 'Last veto point before a turn runs',
            mode: 'execute',
            onError: 'abort',
            canModify: true,
            contextKeys: ['actor', 'thread', 'userText'],
            since: '1.0.0'
        },
        onAiTurnAfter: {
            description: 'Turn finished; the propose/apply layer listens here',
            mode: 'execute',
            onError: 'continue',
            canModify: true,
            contextKeys: ['actor', 'thread', 'turn', 'status'],
            since: '1.0.0'
        }
    };

    static hooks = {
        onAiQuotaCheck: { handler: 'onAiQuotaCheck', priority: 1000 },
        onAiQuotaSettle: { handler: 'onAiQuotaSettle', priority: 1000 }
    };

    static onAiQuotaCheck = onAiQuotaCheck;
    static onAiQuotaSettle = onAiQuotaSettle;

    static routes = [
        { method: 'GET', path: '/api/1/ai/capability', handler: 'apiCapability', auth: 'user' },
        { method: 'POST', path: '/api/1/ai/thread', handler: 'apiCreateThread', auth: 'user' },
        { method: 'GET', path: '/api/1/ai/thread', handler: 'apiListThreads', auth: 'user' },
        { method: 'GET', path: '/api/1/ai/thread/:id', handler: 'apiGetThread', auth: 'user' },
        { method: 'PUT', path: '/api/1/ai/thread/:id', handler: 'apiRenameThread', auth: 'user' },
        { method: 'PUT', path: '/api/1/ai/thread/:id/archive', handler: 'apiArchiveThread', auth: 'user' },
        { method: 'GET', path: '/api/1/ai/thread/:id/turns', handler: 'apiListTurns', auth: 'user' },
        { method: 'POST', path: '/api/1/ai/thread/:id/turn', handler: 'apiStartTurn', auth: 'user' },
        { method: 'POST', path: '/api/1/ai/thread/:id/cancel', handler: 'apiCancelTurn', auth: 'user' },
        { method: 'GET', path: '/api/1/ai/usage', handler: 'apiUsage', auth: 'admin' }
    ];

    static async initialize() {
        if (global.ConfigModel?.extendSchema) {
            global.ConfigModel.extendSchema({
                ai: {
                    _meta: {
                        tabLabel: '{{i18n.view.ui.ai.config.tabLabel}}',
                        order: 80,
                        description: '{{i18n.view.ui.ai.config.tabDescription}}',
                        maxColumns: 2
                    },
                    enabled: {
                        type: 'boolean',
                        default: true,
                        label: '{{i18n.view.ui.ai.config.enabled}}'
                    },
                    allowedRoles: {
                        type: 'array',
                        default: ['user', 'admin', 'root'],
                        inputType: 'tagInput',
                        pattern: '[a-z0-9_-]+',
                        normalize: 'lowercase',
                        label: '{{i18n.view.ui.ai.config.allowedRoles}}'
                    },
                    defaultProvider: {
                        type: 'string',
                        default: '',
                        label: '{{i18n.view.ui.ai.config.defaultProvider}}'
                    },
                    defaultModel: {
                        type: 'string',
                        default: '',
                        label: '{{i18n.view.ui.ai.config.defaultModel}}'
                    },
                    allowedModels: {
                        type: 'string',
                        default: '',
                        inputType: 'textarea',
                        rows: 4,
                        fullWidth: true,
                        startNewRow: true,
                        label: '{{i18n.view.ui.ai.config.allowedModels}}',
                        help: '{{i18n.view.ui.ai.config.allowedModelsHelp}}'
                    },
                    maxRequestsPerDay: {
                        type: 'number',
                        default: 200,
                        label: '{{i18n.view.ui.ai.config.maxRequestsPerDay}}'
                    },
                    maxTokensPerDay: {
                        type: 'number',
                        default: 400000,
                        label: '{{i18n.view.ui.ai.config.maxTokensPerDay}}'
                    },
                    maxRoundsPerTurn: {
                        type: 'number',
                        default: 8,
                        label: '{{i18n.view.ui.ai.config.maxRoundsPerTurn}}'
                    },
                    turnTimeoutMs: {
                        type: 'number',
                        default: 120000,
                        label: '{{i18n.view.ui.ai.config.turnTimeoutMs}}'
                    },
                    maxContextChars: {
                        type: 'number',
                        default: 100000,
                        label: '{{i18n.view.ui.ai.config.maxContextChars}}'
                    },
                    disabledTools: {
                        type: 'string',
                        default: '',
                        inputType: 'textarea',
                        rows: 3,
                        fullWidth: true,
                        startNewRow: true,
                        label: '{{i18n.view.ui.ai.config.disabledTools}}',
                        help: '{{i18n.view.ui.ai.config.disabledToolsHelp}}'
                    },
                    reviewedTools: {
                        type: 'string',
                        default: '',
                        inputType: 'textarea',
                        rows: 3,
                        fullWidth: true,
                        label: '{{i18n.view.ui.ai.config.reviewedTools}}'
                    },
                    retentionDays: {
                        type: 'number',
                        default: 90,
                        label: '{{i18n.view.ui.ai.config.retentionDays}}'
                    },
                    autoTitle: {
                        type: 'boolean',
                        default: true,
                        label: '{{i18n.view.ui.ai.config.autoTitle}}'
                    },
                    siteInstructions: {
                        type: 'string',
                        default: '',
                        inputType: 'textarea',
                        rows: 6,
                        fullWidth: true,
                        startNewRow: true,
                        label: '{{i18n.view.ui.ai.config.siteInstructions}}'
                    }
                }
            });
        }

        try {
            await AiThreadModel.ensureIndexes();
            await AiTurnModel.ensureIndexes();
            await AiUsageModel.ensureIndexes();
        } catch (error) {
            LogController?.logError?.(null, 'aiCore.initialize', `error: indexes ${error.message}`);
        }

        subscribeCancelBroadcast();

        const settings = await loadSettings();
        if (settings.retentionDays > 0) {
            const cutoff = new Date(Date.now() - settings.retentionDays * 86400000);
            try {
                const purged = await AiTurnModel.purgeOlderThan(cutoff);
                if (purged) {
                    LogController?.logInfo?.(null, 'aiCore.initialize', `success: purged ${purged} old turns`);
                }
            } catch (error) {
                LogController?.logError?.(null, 'aiCore.initialize', `error: retention ${error.message}`);
            }
        }

        global.AiCore = {
            registerTools,
            resolveTools,
            runTurn: (opts) => runTurn({
                ...opts,
                threadModel: opts.threadModel || AiThreadModel,
                turnModel: opts.turnModel || AiTurnModel,
                usageModel: opts.usageModel || AiUsageModel
            }),
            listProviders,
            loadSettings
        };
    }

    static async _gate(req, res) {
        const settings = await loadSettings();
        const actor = actorFromRequest(req, {
            scopeType: req.body?.scopeType || req.query?.scopeType,
            scopeId: req.body?.scopeId || req.query?.scopeId
        });
        if (!settings.enabled) {
            sendError(req, res, 403, 'AI is disabled', 'AI_DISABLED');
            return null;
        }
        if (!roleAllowed(actor, settings)) {
            sendError(req, res, 403, 'AI is not allowed for this role', 'AI_ROLE_DENIED');
            return null;
        }
        return { settings, actor };
    }

    static async _ownedThread(req, actor, id) {
        const thread = await AiThreadModel.findById(id);
        if (!thread) {
            return null;
        }
        if (thread.createdBy !== threadOwner(actor)) {
            return false;
        }
        return thread;
    }

    static async apiCapability(req, res) {
        const start = Date.now();
        try {
            const gated = await this._gate(req, res);
            if (!gated) {
                return;
            }
            const { settings, actor } = gated;
            logReq(req, 'aiCore.apiCapability', actor);
            const resolved = await resolveTools(actor, { policy: settings.policy });
            const providers = await listProviders();
            const menu = filterAllowedModels(providers, settings);
            const quota = await quotaSnapshot(actor.username, settings.caps);
            res.json({
                success: true,
                data: {
                    transport: chooseTransport(resolved.tools),
                    tools: resolved.publicTools,
                    withheld: resolved.withheld,
                    models: menu,
                    defaultModel: pickDefaultModel(menu, settings),
                    quota,
                    scope: resolved.scope
                }
            });
            logOk(req, 'aiCore.apiCapability', actor, `${Date.now() - start}ms`);
        } catch (error) {
            logErr(req, 'aiCore.apiCapability', actorFromRequest(req), error);
            return sendError(req, res, 500, 'Failed to read AI capability', 'AI_CAPABILITY_FAILED');
        }
    }

    static async apiCreateThread(req, res) {
        try {
            const gated = await this._gate(req, res);
            if (!gated) {
                return;
            }
            const { settings, actor } = gated;
            actor.scopeType = req.body?.scopeType || actor.scopeType;
            actor.scopeId = req.body?.scopeId || actor.scopeId;
            logReq(req, 'aiCore.apiCreateThread', actor);
            const thread = await AiThreadModel.findOrCreateActive({
                scopeType: actor.scopeType,
                scopeId: actor.scopeId,
                createdBy: threadOwner(actor),
                onBehalfOf: actor.onBehalfOf,
                label: req.body?.label || '',
                provider: req.body?.provider || settings.defaultProvider,
                model: req.body?.model || settings.defaultModel
            });
            res.json({ success: true, data: thread });
            logOk(req, 'aiCore.apiCreateThread', actor, String(thread._id));
        } catch (error) {
            logErr(req, 'aiCore.apiCreateThread', actorFromRequest(req), error);
            return sendError(req, res, 500, 'Failed to create thread', 'AI_THREAD_CREATE_FAILED');
        }
    }

    static async apiListThreads(req, res) {
        try {
            const gated = await this._gate(req, res);
            if (!gated) {
                return;
            }
            const { actor } = gated;
            logReq(req, 'aiCore.apiListThreads', actor);
            const threads = await AiThreadModel.listForOwner({
                createdBy: threadOwner(actor),
                scopeType: req.query.scopeType,
                scopeId: req.query.scopeId,
                status: req.query.status
            });
            res.json({ success: true, data: threads });
            logOk(req, 'aiCore.apiListThreads', actor, `${threads.length} threads`);
        } catch (error) {
            logErr(req, 'aiCore.apiListThreads', actorFromRequest(req), error);
            return sendError(req, res, 500, 'Failed to list threads', 'AI_THREAD_LIST_FAILED');
        }
    }

    static async apiGetThread(req, res) {
        try {
            const gated = await this._gate(req, res);
            if (!gated) {
                return;
            }
            const { actor } = gated;
            logReq(req, 'aiCore.apiGetThread', actor);
            const thread = await this._ownedThread(req, actor, req.params.id);
            if (thread == null) {
                return sendError(req, res, 404, 'Thread not found', 'AI_THREAD_NOT_FOUND');
            }
            if (thread === false) {
                return sendError(req, res, 403, 'Not your thread', 'AI_THREAD_FORBIDDEN');
            }
            res.json({ success: true, data: thread });
            logOk(req, 'aiCore.apiGetThread', actor, String(thread._id));
        } catch (error) {
            logErr(req, 'aiCore.apiGetThread', actorFromRequest(req), error);
            return sendError(req, res, 500, 'Failed to read thread', 'AI_THREAD_GET_FAILED');
        }
    }

    static async apiRenameThread(req, res) {
        try {
            const gated = await this._gate(req, res);
            if (!gated) {
                return;
            }
            const { actor } = gated;
            logReq(req, 'aiCore.apiRenameThread', actor);
            const thread = await this._ownedThread(req, actor, req.params.id);
            if (thread == null) {
                return sendError(req, res, 404, 'Thread not found', 'AI_THREAD_NOT_FOUND');
            }
            if (thread === false) {
                return sendError(req, res, 403, 'Not your thread', 'AI_THREAD_FORBIDDEN');
            }
            const updated = await AiThreadModel.rename(thread._id, req.body?.label || '');
            res.json({ success: true, data: updated });
            logOk(req, 'aiCore.apiRenameThread', actor, String(thread._id));
        } catch (error) {
            logErr(req, 'aiCore.apiRenameThread', actorFromRequest(req), error);
            return sendError(req, res, 500, 'Failed to rename thread', 'AI_THREAD_RENAME_FAILED');
        }
    }

    static async apiArchiveThread(req, res) {
        try {
            const gated = await this._gate(req, res);
            if (!gated) {
                return;
            }
            const { actor } = gated;
            logReq(req, 'aiCore.apiArchiveThread', actor);
            const thread = await this._ownedThread(req, actor, req.params.id);
            if (thread == null) {
                return sendError(req, res, 404, 'Thread not found', 'AI_THREAD_NOT_FOUND');
            }
            if (thread === false) {
                return sendError(req, res, 403, 'Not your thread', 'AI_THREAD_FORBIDDEN');
            }
            const updated = await AiThreadModel.archive(thread._id);
            res.json({ success: true, data: updated });
            logOk(req, 'aiCore.apiArchiveThread', actor, String(thread._id));
        } catch (error) {
            logErr(req, 'aiCore.apiArchiveThread', actorFromRequest(req), error);
            return sendError(req, res, 500, 'Failed to archive thread', 'AI_THREAD_ARCHIVE_FAILED');
        }
    }

    static async apiListTurns(req, res) {
        try {
            const gated = await this._gate(req, res);
            if (!gated) {
                return;
            }
            const { actor } = gated;
            logReq(req, 'aiCore.apiListTurns', actor);
            const thread = await this._ownedThread(req, actor, req.params.id);
            if (thread == null) {
                return sendError(req, res, 404, 'Thread not found', 'AI_THREAD_NOT_FOUND');
            }
            if (thread === false) {
                return sendError(req, res, 403, 'Not your thread', 'AI_THREAD_FORBIDDEN');
            }
            const turns = await AiTurnModel.listByThread(thread._id);
            res.json({ success: true, data: turns });
            logOk(req, 'aiCore.apiListTurns', actor, `${turns.length} turns`);
        } catch (error) {
            logErr(req, 'aiCore.apiListTurns', actorFromRequest(req), error);
            return sendError(req, res, 500, 'Failed to list turns', 'AI_TURN_LIST_FAILED');
        }
    }

    static async apiStartTurn(req, res) {
        const actorGuess = actorFromRequest(req);
        try {
            const gated = await this._gate(req, res);
            if (!gated) {
                return;
            }
            const { settings, actor } = gated;
            logReq(req, 'aiCore.apiStartTurn', actor);
            const thread = await this._ownedThread(req, actor, req.params.id);
            if (thread == null) {
                return sendError(req, res, 404, 'Thread not found', 'AI_THREAD_NOT_FOUND');
            }
            if (thread === false) {
                return sendError(req, res, 403, 'Not your thread', 'AI_THREAD_FORBIDDEN');
            }
            actor.scopeType = thread.scopeType;
            actor.scopeId = thread.scopeId;
            const { sink, close, abortSignal } = openSseTurn(req, res, String(thread._id));
            try {
                await runTurn({
                    actor,
                    thread,
                    threadId: thread._id,
                    userText: req.body?.text || req.body?.userText || '',
                    settings,
                    sink,
                    abortSignal,
                    provider: req.body?.provider,
                    model: req.body?.model,
                    context: req.body?.context,
                    target: req.body?.target,
                    script: req.body?.script,
                    threadModel: AiThreadModel,
                    turnModel: AiTurnModel,
                    usageModel: AiUsageModel
                });
                logOk(req, 'aiCore.apiStartTurn', actor, String(thread._id));
            } finally {
                close();
            }
        } catch (error) {
            logErr(req, 'aiCore.apiStartTurn', actorGuess, error);
            if (!res.headersSent) {
                const status = error.code === 'AI_QUOTA_EXCEEDED' ? 429
                    : error.code === 'AI_LEASE_HELD' ? 409
                    : error.code === 'AI_NO_PROVIDER' ? 400
                    : 500;
                return sendError(req, res, status, error.message, error.code || 'AI_TURN_FAILED');
            }
            if (!res.writableEnded) {
                res.end();
            }
        }
    }

    static async apiCancelTurn(req, res) {
        try {
            const gated = await this._gate(req, res);
            if (!gated) {
                return;
            }
            const { actor } = gated;
            logReq(req, 'aiCore.apiCancelTurn', actor);
            const thread = await this._ownedThread(req, actor, req.params.id);
            if (thread == null) {
                return sendError(req, res, 404, 'Thread not found', 'AI_THREAD_NOT_FOUND');
            }
            if (thread === false) {
                return sendError(req, res, 403, 'Not your thread', 'AI_THREAD_FORBIDDEN');
            }
            await broadcastCancel(String(thread._id));
            const turns = await AiTurnModel.listByThread(thread._id);
            const running = [...turns].reverse().find((row) => row.status === 'running');
            if (running) {
                await AiTurnModel.requestCancel(running._id);
            }
            res.json({ success: true, data: { canceled: true } });
            logOk(req, 'aiCore.apiCancelTurn', actor, String(thread._id));
        } catch (error) {
            logErr(req, 'aiCore.apiCancelTurn', actorFromRequest(req), error);
            return sendError(req, res, 500, 'Failed to cancel turn', 'AI_CANCEL_FAILED');
        }
    }

    static async apiUsage(req, res) {
        const actor = actorFromRequest(req);
        try {
            logReq(req, 'aiCore.apiUsage', actor);
            const settings = await loadSettings();
            const rows = (await AiUsageModel.listRecent(200)).map((row) => {
                const key = String(row.periodKey || '');
                const caps = (settings.caps || []).filter((cap) => {
                    if (cap.period === 'day') {
                        return /^\d{4}-\d{2}-\d{2}$/.test(key);
                    }
                    if (cap.period === 'month') {
                        return /^\d{4}-\d{2}$/.test(key);
                    }
                    return false;
                });
                return {
                    ...row,
                    overQuota: !!firstExceededCap(row, caps)
                };
            });
            res.json({ success: true, data: rows });
            logOk(req, 'aiCore.apiUsage', actor, `${rows.length} rows`);
        } catch (error) {
            logErr(req, 'aiCore.apiUsage', actor, error);
            return sendError(req, res, 500, 'Failed to read usage', 'AI_USAGE_FAILED');
        }
    }
}

export default AiCoreController;

// EOF plugins/ai-core/webapp/controller/aiCore.js
