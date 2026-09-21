/**
 * @name            jPulse Framework / Plugins / AI Core / WebApp / Agent / Scope
 * @tagline         Delete AI data for one site object
 * @description     Cancel, turns, threads, then staged images. Never touches usage.
 * @file            plugins/ai-core/webapp/utils/agent/scope.js
 * @version         1.0.14
 * @release         2026-09-20
 * @repository      https://github.com/jpulse-net/plugin-ai-core
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.20, Grok 4.6
 */

import { broadcastCancel } from './cancel.js';

/**
 * Erase every conversation for one (scopeType, scopeId). All users.
 * @param {{ scopeType: string, scopeId: string }} params
 * @param {object} [deps]
 * @returns {Promise<{ threads: number, turns: number, images: number }>}
 */
export async function deleteByScope(params = {}, deps = {}) {
    const scopeType = String(params.scopeType || '').trim();
    const scopeId = String(params.scopeId || '').trim();
    if (!scopeType || !scopeId) {
        const error = new Error('scopeType and scopeId are required');
        error.code = 'AI_BAD_ARGS';
        throw error;
    }
    const threadModel = deps.threadModel;
    const turnModel = deps.turnModel;
    if (!threadModel?.listByScope || !turnModel?.deleteByThreadIds) {
        const error = new Error('threadModel and turnModel are required');
        error.code = 'AI_BAD_ARGS';
        throw error;
    }
    try {
        const threads = await threadModel.listByScope({ scopeType, scopeId });
        for (const thread of threads) {
            try {
                await broadcastCancel(String(thread._id), deps);
            } catch {
                // best-effort; the wipe continues
            }
        }
        const threadIds = threads.map((thread) => String(thread._id));
        const turns = await turnModel.deleteByThreadIds(threadIds);
        const deletedThreads = await threadModel.deleteByScope({ scopeType, scopeId });
        let images = 0;
        if (typeof deps.deleteStagedThread === 'function') {
            for (const thread of threads) {
                try {
                    images += await deps.deleteStagedThread(
                        thread.createdBy,
                        String(thread._id),
                        deps.redisManager
                    ) || 0;
                } catch {
                    // Redis is best-effort; TTL expires leftovers
                }
            }
        }
        const counts = {
            threads: deletedThreads,
            turns,
            images
        };
        global.LogController?.logInfo?.(
            null,
            'aiCore.deleteByScope',
            `success: ${scopeType}/${scopeId} threads=${counts.threads} turns=${counts.turns} images=${counts.images}`
        );
        return counts;
    } catch (error) {
        global.LogController?.logError?.(
            null,
            'aiCore.deleteByScope',
            `error: ${error.message}`
        );
        throw error;
    }
}

// EOF plugins/ai-core/webapp/utils/agent/scope.js
