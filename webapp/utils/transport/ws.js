/**
 * @name            jPulse Framework / Plugins / AI Core / WebApp / Transport / WebSocket
 * @tagline         Per-thread AI namespace and client-host bridge
 * @description     Authorize the handshake, start turns on the socket, call the origin tab
 * @file            plugins/ai-core/webapp/utils/transport/ws.js
 * @version         1.0.4
 * @release         2026-09-17
 * @repository      https://github.com/jpulse-net/plugin-ai-core
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.20, Grok 4.6
 */

import WebSocketController from '../../../../../webapp/controller/websocket.js';
import { loadSettings, roleAllowed, runTurn } from '../agent/index.js';
import AiThreadModel from '../../model/aiThread.js';
import AiTurnModel from '../../model/aiTurn.js';
import AiUsageModel from '../../model/aiUsage.js';
import {
    AI_EXECUTE_FAILED,
    AI_RESULT_TOO_LARGE,
    actorFromRequest,
    makeEnvelope,
    RESULT_SIZE_CAP,
    threadOwner
} from '../tools/index.js';
import { sanitizeImageMeta, sanitizeSourceMeta } from '../attachments/stream.js';

export const AI_WS_PATTERN = '/api/1/ws/ai/:threadId';
export const AI_WS_MAX_SIZE = RESULT_SIZE_CAP;

const UNICAST_TYPES = new Set(['text_delta']);
const origins = new Map();

export function namespacePath(threadId) {
    return `/api/1/ws/ai/${threadId}`;
}

/**
 * @param {object} req
 * @param {object} ctx
 * @param {object} [deps]
 * @returns {Promise<object|null>}
 */
export async function authorizeAiSocket(req, ctx, deps = {}) {
    const load = deps.loadSettings || loadSettings;
    const threadModel = deps.threadModel || AiThreadModel;
    const settings = await load();
    if (!settings.enabled) {
        return null;
    }
    const actor = (deps.actorFromRequest || actorFromRequest)(req, { origin: 'ws' });
    if (!roleAllowed(actor, settings)) {
        return null;
    }
    const threadId = ctx?.params?.threadId;
    if (!threadId) {
        return null;
    }
    const thread = await threadModel.findById(threadId);
    if (!thread) {
        return null;
    }
    if (thread.createdBy !== threadOwner(actor)) {
        return null;
    }
    return {
        ...ctx,
        threadId: String(thread._id),
        username: actor.username,
        createdBy: thread.createdBy,
        scopeType: thread.scopeType,
        scopeId: thread.scopeId,
        roles: actor.roles
    };
}

/**
 * Map WebSocketController.request() onto the tool envelope.
 * stall is set only for a lost connection.
 * @param {object} reply
 * @returns {object}
 */
export function mapClientReply(reply) {
    if (reply && reply.success === true) {
        const payload = reply.data && typeof reply.data === 'object' ? reply.data : reply;
        return makeEnvelope({
            ...payload,
            ok: payload.ok !== false
        });
    }
    const code = reply?.code || AI_EXECUTE_FAILED;
    if (code === 'NOT_CONNECTED' || code === 'CONNECTION_LOST') {
        return makeEnvelope({
            ok: false,
            code,
            error: reply?.error || 'Origin tab is not connected.',
            hint: 'Retry the turn when the connection is back.',
            stall: true
        });
    }
    if (code === 'REQUEST_TIMEOUT') {
        return makeEnvelope({
            ok: false,
            code,
            error: reply?.error || 'Client-host tool timed out.',
            hint: 'Narrow the request, or retry.'
        });
    }
    if (code === 'MESSAGE_TOO_LARGE' || code === AI_RESULT_TOO_LARGE) {
        return makeEnvelope({
            ok: false,
            code: AI_RESULT_TOO_LARGE,
            error: reply?.error || 'Tool result exceeded the size cap.',
            hint: 'Narrow the request — ask for a subtree, a page, or fewer fields — and try again.'
        });
    }
    return makeEnvelope({
        ok: false,
        code,
        error: reply?.error || 'Client-host tool failed.',
        hint: 'Retry, or use a different tool.'
    });
}

/**
 * @param {object} params
 * @returns {Promise<object>}
 */
export async function executeClientTool(params) {
    const request = params.request
        || global.WebSocketController?.request?.bind(global.WebSocketController);
    if (typeof request !== 'function') {
        return mapClientReply({ success: false, code: 'NOT_CONNECTED', error: 'WebSocket controller missing' });
    }
    const reply = await request(
        params.clientId,
        params.nsPath,
        {
            type: 'tool_call',
            data: {
                id: params.id || '',
                name: params.name,
                args: params.args || {},
                moduleHash: params.moduleHash || null,
                module: params.module || null
            }
        },
        { timeoutMs: params.timeoutMs }
    );
    return mapClientReply(reply);
}

function websocketController(deps) {
    return deps.WebSocketController || global.WebSocketController || WebSocketController;
}

export function registerAiNamespace(deps = {}) {
    const WS = websocketController(deps);
    if (!WS?.createNamespace) {
        return null;
    }
    const ns = WS.createNamespace(AI_WS_PATTERN, {
        requireAuth: true,
        messageLimits: {
            maxSize: AI_WS_MAX_SIZE
        },
        onCreate: (req, ctx) => authorizeAiSocket(req, ctx, deps)
    });
    ns.onMessage(async (conn) => {
        const message = conn.message || {};
        const type = message.type;
        if (type !== 'turn') {
            return;
        }
        const threadId = conn.ctx?.threadId || conn.ctx?.params?.threadId;
        if (!threadId) {
            return;
        }
        const actor = actorFromRequest({
            user: { username: conn.ctx.username, roles: conn.ctx.roles || [] }
        }, {
            origin: 'ws',
            scopeType: conn.ctx.scopeType,
            scopeId: conn.ctx.scopeId
        });
        if (threadOwner(actor) !== conn.ctx.createdBy) {
            return;
        }
        const nsPath = namespacePath(threadId);
        origins.set(nsPath, conn.clientId);
        const settings = await (deps.loadSettings || loadSettings)();
        const threadModel = deps.threadModel || AiThreadModel;
        const thread = await threadModel.findById(threadId);
        if (!thread || thread.createdBy !== threadOwner(actor)) {
            return;
        }
        const data = message.data || {};
        const sink = (event) => emitTurnEvent(WS, ns, nsPath, conn.clientId, event);
        try {
            await runTurn({
                actor,
                thread,
                threadId: thread._id,
                userText: data.text || data.userText || '',
                settings,
                sink,
                provider: data.provider,
                model: data.model,
                context: data.context,
                target: data.target,
                script: data.script,
                sources: sanitizeSourceMeta(data.sources),
                images: sanitizeImageMeta(data.images),
                threadModel,
                turnModel: deps.turnModel || AiTurnModel,
                usageModel: deps.usageModel || AiUsageModel,
                clientExecutor: (call) => executeClientTool({
                    ...call,
                    clientId: conn.clientId,
                    nsPath,
                    request: deps.request,
                    timeoutMs: call.timeoutMs
                })
            });
        } catch (error) {
            sink({
                type: 'error',
                code: error.code || 'AI_TURN_FAILED',
                message: error.message
            });
        }
    });
    ns.onDisconnect((conn) => {
        const threadId = conn.ctx?.threadId || conn.ctx?.params?.threadId;
        if (!threadId) {
            return;
        }
        const nsPath = namespacePath(threadId);
        if (origins.get(nsPath) === conn.clientId) {
            origins.delete(nsPath);
        }
        WS.removeNamespace(nsPath, { removeIfEmpty: true });
    });
    return ns;
}

function emitTurnEvent(WS, ns, nsPath, originClientId, event) {
    if (!event || typeof event !== 'object') {
        return;
    }
    // Pattern templates keep path "/api/1/ws/ai/:threadId". Clients live on
    // the instance path; ns.broadcast / ns.sendToClient would miss them.
    if (UNICAST_TYPES.has(event.type)) {
        WS.sendToClient?.(originClientId, nsPath, event);
        return;
    }
    WS.broadcast?.(nsPath, event);
}

// EOF plugins/ai-core/webapp/utils/transport/ws.js
