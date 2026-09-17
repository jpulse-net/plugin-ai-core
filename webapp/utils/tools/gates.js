/**
 * @name            jPulse Framework / Plugins / AI Core / WebApp / Tools / Gates
 * @tagline         Four authorization gates
 * @description     Existence, capability, admin policy, turn budget — all take an actor
 * @file            plugins/ai-core/webapp/utils/tools/gates.js
 * @version         1.0.2
 * @release         2026-09-17
 * @repository      https://github.com/jpulse-net/plugin-ai-core
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.20, Grok 4.6
 */

import { capabilitiesFromScope } from './actor.js';
import { checkBudgetAndDedupe } from './budgets.js';
import {
    AI_CAPABILITY_DENIED,
    AI_POLICY_DENIED,
    AI_UNKNOWN_TOOL,
    makeEnvelope
} from './envelope.js';
import { isToolEnabled } from './policy.js';

/**
 * Gates 1–3 (existence, capability, policy). Budget is gate 4 at execute time.
 * @param {object|null} tool
 * @param {object} actor
 * @param {object} scope
 * @param {object} policy
 * @returns {object|null} denial envelope or null
 */
export function authorizeTool(tool, actor, scope, policy) {
    if (!tool) {
        return makeEnvelope({
            ok: false,
            code: AI_UNKNOWN_TOOL,
            error: 'Unknown tool.',
            hint: 'Call a tool from this turn\'s offered list.'
        });
    }
    if (tool.requires) {
        const caps = capabilitiesFromScope(scope);
        if (!caps.has(tool.requires)) {
            return makeEnvelope({
                ok: false,
                code: AI_CAPABILITY_DENIED,
                error: `This actor does not have ${tool.requires} on this scope.`,
                hint: 'Use a read tool, or ask the user to apply a change.',
                summary: `${tool.name} denied`
            });
        }
    }
    if (!isToolEnabled(tool.name, policy)) {
        return makeEnvelope({
            ok: false,
            code: AI_POLICY_DENIED,
            error: 'This tool is disabled by site policy.',
            hint: 'Use a different tool, or reply without it.',
            summary: `${tool.name} disabled`
        });
    }
    return null;
}

/**
 * All four gates. Budget state is required.
 */
export function gateTool(tool, args, ctx) {
    const denied = authorizeTool(tool, ctx.actor, ctx.scope, ctx.policy);
    if (denied) {
        return denied;
    }
    return checkBudgetAndDedupe(tool, args, ctx.budgetState, ctx.settings);
}

// EOF plugins/ai-core/webapp/utils/tools/gates.js
