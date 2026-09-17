/**
 * @name            jPulse Framework / Plugins / AI Core / WebApp / Transport
 * @tagline         Transport layer public surface
 * @description     HTTP/SSE for controller-centric turns; WebSocket for client-host tools
 * @file            plugins/ai-core/webapp/utils/transport/index.js
 * @version         1.0.3
 * @release         2026-09-17
 * @repository      https://github.com/jpulse-net/plugin-ai-core
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.20, Grok 4.6
 */

export { openSseTurn, SSE_HEARTBEAT_MS, writeSseComment, writeSseEvent, writeSseHeaders } from './sse.js';
export {
    AI_WS_MAX_SIZE,
    AI_WS_PATTERN,
    authorizeAiSocket,
    executeClientTool,
    mapClientReply,
    namespacePath,
    registerAiNamespace
} from './ws.js';

/**
 * HTTP is enough when no offered tool is client-host.
 * @param {object[]} tools
 * @returns {'http'|'ws'}
 */
export function chooseTransport(tools) {
    if ((tools || []).some(tool => tool.host === 'client')) {
        return 'ws';
    }
    return 'http';
}

// EOF plugins/ai-core/webapp/utils/transport/index.js
