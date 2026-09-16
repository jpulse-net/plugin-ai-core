/**
 * @name            jPulse Framework / Plugins / AI Core / WebApp / Tools
 * @tagline         Tools layer public surface
 * @description     Registry, actor, gates, budgets, envelope — no agent or transport imports
 * @file            plugins/ai-core/webapp/utils/tools/index.js
 * @version         1.0.1
 * @release         2026-09-17
 * @repository      https://github.com/jpulse-net/plugin-ai-core
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.20, Grok 4.6
 */

export {
    actorFromRequest,
    capabilitiesFromScope,
    normalizeActor,
    onBehalfOfLogSuffix,
    threadOwner
} from './actor.js';
export { createBudgetState } from './budgets.js';
export { normalizeDescriptor, publicTool } from './descriptor.js';
export {
    AI_BUDGET_EXCEEDED,
    AI_CAPABILITY_DENIED,
    AI_CLIENT_HOST,
    AI_DEDUPE,
    AI_EXECUTE_FAILED,
    AI_POLICY_DENIED,
    AI_RESULT_TOO_LARGE,
    AI_UNKNOWN_TOOL,
    RESULT_SIZE_CAP,
    enforceSizeCap,
    makeEnvelope,
    stripMedia
} from './envelope.js';
export { executeTool } from './execute.js';
export { authorizeTool, gateTool } from './gates.js';
export { isToolEnabled, normalizePolicy, seedReviewedNames } from './policy.js';
export {
    clearTools,
    collectTools,
    getTool,
    listRegisteredTools,
    registerTools
} from './registry.js';
export { resolveScope, resolveTools } from './resolve.js';

// EOF plugins/ai-core/webapp/utils/tools/index.js
