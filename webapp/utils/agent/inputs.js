/**
 * @name            jPulse Framework / Plugins / AI Core / WebApp / Agent / Inputs
 * @tagline         Turn-start user content and follow-up parts
 * @description     Thin loop-facing wrapper over the attachments layer
 * @file            plugins/ai-core/webapp/utils/agent/inputs.js
 * @version         1.0.7
 * @release         2026-09-18
 * @repository      https://github.com/jpulse-net/plugin-ai-core
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.20, Grok 4.6
 */

import {
    buildUserContent,
    mediaFollowUp,
    modelHasVision,
    sourceRefsFrom,
    takeStagedImages
} from '../attachments/index.js';
import { sanitizeImageMeta, sanitizeSourceMeta } from '../attachments/stream.js';
import { threadOwner } from '../tools/actor.js';

function cleanParams(params) {
    return {
        sources: sanitizeSourceMeta(params?.sources),
        images: sanitizeImageMeta(params?.images)
    };
}

export function refsForTurn(params) {
    const cleaned = cleanParams(params);
    return {
        sourceRefs: sourceRefsFrom(cleaned.sources, cleaned.images)
    };
}

export function turnExtras(params) {
    const cleaned = cleanParams(params);
    return {
        resolve: {
            hasSources: cleaned.sources.length > 0
        },
        prompt: cleaned
    };
}

export async function openUserContent(params, settings, chosen) {
    const text = params.userText || '';
    const images = Array.isArray(params.images) ? params.images : [];
    if (!images.length || settings.imagesEnabled === false) {
        return text;
    }
    if (!modelHasVision(chosen)) {
        return text;
    }
    const staged = await takeStagedImages(
        threadOwner(params.actor),
        String(params.threadId || params.thread?._id || ''),
        images,
        params.redisManager
    );
    return buildUserContent(text, staged);
}

export function followFromResult(result) {
    if (!result || result.media == null) {
        return null;
    }
    return mediaFollowUp(result.media);
}

// EOF plugins/ai-core/webapp/utils/agent/inputs.js
