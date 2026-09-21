/**
 * @name            jPulse Framework / Plugins / AI Core / WebApp / Agent
 * @tagline         Agent layer public surface
 * @description     Turn loop, quota, lease, prompt, providers — no transport imports
 * @file            plugins/ai-core/webapp/utils/agent/index.js
 * @version         1.0.14
 * @release         2026-09-20
 * @repository      https://github.com/jpulse-net/plugin-ai-core
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.20, Grok 4.6
 */

export { broadcastCancel, cancelChannel, isCancelRequested, requestCancel, subscribeCancelBroadcast } from './cancel.js';
export { acquireLease, clearLocalLeases, releaseLease } from './lease.js';
export { assemblePrompt, historyToMessages } from './prompt.js';
export {
    chooseProviderModel,
    computeCost,
    filterAllowedModels,
    gateModelsForVision,
    hasCapability,
    listProviders,
    normalizeProvider,
    pairOnMenu,
    pickDefaultModel,
    priceForModel,
    queryHasImages
} from './providers.js';
export {
    DEFAULT_CAPS,
    defaultQuotaDecision,
    firstExceededCap,
    onAiQuotaCheck,
    onAiQuotaSettle,
    periodKey,
    quotaSnapshot,
    usageDocumentKey
} from './quota.js';
export {
    AI_CONFIG_DEFAULTS,
    cacheSettings,
    getCachedSettings,
    loadSettings,
    mergeSettings,
    roleAllowed
} from './settings.js';
export { deleteByScope } from './scope.js';
export { deriveThreadLabel, runTurn } from './turnLoop.js';

// EOF plugins/ai-core/webapp/utils/agent/index.js
