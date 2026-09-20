/**
 * @name            jPulse Framework / Plugins / AI Core / WebApp / Utils / Proposals
 * @tagline         Derive, persist, and annotate propose/apply records
 * @description     Records from toolCalls; history notes; no turn-loop imports
 * @file            plugins/ai-core/webapp/utils/proposals/index.js
 * @version         1.0.11
 * @release         2026-09-19
 * @repository      https://github.com/jpulse-net/plugin-ai-core
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.20, Grok 4.6
 */

export const DEFAULT_CLAIM_PHRASES = [
    "I've proposed",
    'I have proposed',
    'already proposed',
    're-proposed',
    'I created an Apply card',
    'I have created an Apply card',
    'proposal is ready',
    'Ready to Apply',
    'review and Apply',
    'click Apply',
    'press Apply',
    'hit Apply',
    'the Apply card',
    'Apply card',
    'Apply in the panel'
];

export const UNDONE_NOTE = '[system] The user undid the most recent applied proposal. Re-read the current state; do not assume that proposal\'s writes persist. Later applied proposals still stand.';

export const FALSE_CLAIM_NOTE = '[system] A previous reply claimed a proposal but no Apply card was created. That change was not proposed. If the user still wants it, call a proposing tool now. Do not say you already proposed it.';

export const PROPOSE_PROMPT = 'A proposing tool creates an Apply card the user must apply. Several proposing calls in one turn are allowed; each success is its own card and every pending card stays applyable. Never claim a change was made, or that a card exists, unless a proposing tool succeeded in this turn. Never say only the latest card is active.';

/**
 * @param {string} turnId
 * @param {string} callId
 * @returns {string}
 */
export function mintProposalId(turnId, callId) {
    return `${String(turnId || '')}:${String(callId || '')}`;
}

function cardLabel(proposal) {
    const preview = String(proposal && proposal.preview || '');
    const first = preview.split('\n')[0].trim();
    return first || (proposal && proposal.kind) || 'proposal';
}

function normalizeRecord(raw, id) {
    const payload = raw && raw.payload != null && typeof raw.payload === 'object' && !Array.isArray(raw.payload)
        ? raw.payload
        : {};
    return {
        id: raw && raw.id ? String(raw.id) : id,
        kind: raw && raw.kind ? String(raw.kind) : '',
        payload,
        preview: raw && raw.preview != null ? String(raw.preview) : '',
        targetId: raw && raw.targetId ? String(raw.targetId) : '',
        applied: !!(raw && raw.applied),
        appliedAt: (raw && raw.appliedAt) || null,
        undone: !!(raw && raw.undone),
        undoneAt: (raw && raw.undoneAt) || null
    };
}

/**
 * Persisted `turn.proposals` wins when non-empty; otherwise derive from toolCalls.
 * @param {object} turn
 * @returns {object[]}
 */
export function proposalsFromTurn(turn) {
    if (!turn) {
        return [];
    }
    if (Array.isArray(turn.proposals) && turn.proposals.length) {
        return turn.proposals.map((row) => normalizeRecord(row, row && row.id));
    }
    const turnId = String(turn._id || '');
    const out = [];
    for (const call of turn.toolCalls || []) {
        const result = call && call.result;
        const raw = result && result.ok && result.data && result.data.proposal;
        if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
            continue;
        }
        const callId = call.id || call.callId || String(out.length);
        out.push(normalizeRecord(raw, mintProposalId(turnId, callId)));
    }
    return out;
}

/**
 * @param {string[]|string} list
 * @returns {{ source: string, test: (text: string) => boolean }[]}
 */
export function compilePhrases(list) {
    const lines = Array.isArray(list)
        ? list
        : String(list || '').split(/\n/);
    const compiled = [];
    for (const raw of lines) {
        const source = String(raw || '').trim();
        if (!source) {
            continue;
        }
        const match = source.match(/^\/(.+)\/([a-z]*)$/i);
        if (match) {
            try {
                const regex = new RegExp(match[1], match[2]);
                compiled.push({
                    source,
                    test: (text) => regex.test(text)
                });
                continue;
            } catch {
                // fall through as a literal
            }
        }
        const needle = source.toLowerCase();
        compiled.push({
            source,
            test: (text) => String(text || '').toLowerCase().indexOf(needle) !== -1
        });
    }
    return compiled;
}

/**
 * @param {string} text
 * @param {string[]|{ test: Function }[]} phrases
 * @returns {boolean}
 */
export function claimsWithoutCard(text, phrases) {
    if (!text) {
        return false;
    }
    const compiled = Array.isArray(phrases) && phrases[0] && typeof phrases[0].test === 'function'
        ? phrases
        : compilePhrases(phrases && phrases.length ? phrases : DEFAULT_CLAIM_PHRASES);
    return compiled.some((row) => row.test(text));
}

/**
 * @param {object} turn
 * @returns {string}
 */
export function formatCardsNote(turn) {
    const list = proposalsFromTurn(turn);
    if (!list.length) {
        return '';
    }
    const parts = list.map((row) => {
        const label = JSON.stringify(cardLabel(row));
        if (row.undone) {
            return `${label} undone`;
        }
        if (row.applied) {
            return `${label} applied`;
        }
        return `${label} not applied`;
    });
    return `[system] Cards from that turn: ${parts.join('; ')}.`;
}

function turnOfferedProposing(turn, proposingOffered) {
    if (proposingOffered === true) {
        return true;
    }
    if (turn && turn.proposingOffered === true) {
        return true;
    }
    return proposalsFromTurn(turn).length > 0;
}

/**
 * Interleave cards / undone / false-claim notes after the assembled history.
 * @param {object[]} messages
 * @param {object[]} turns
 * @param {{ phrases?: string[], proposingOffered?: boolean }} [opts]
 * @returns {object[]}
 */
export function annotateHistory(messages, turns, opts = {}) {
    const phrases = opts.phrases && opts.phrases.length ? opts.phrases : DEFAULT_CLAIM_PHRASES;
    const out = Array.isArray(messages) ? messages.slice() : [];
    let lastProposal = null;
    let lastFalseClaim = false;
    let assistantIndex = -1;
    for (const turn of turns || []) {
        if (!turn || !turn.agentText) {
            continue;
        }
        for (let i = assistantIndex + 1; i < out.length; i += 1) {
            if (out[i].role === 'assistant' && out[i].content === turn.agentText) {
                assistantIndex = i;
                break;
            }
        }
        const list = proposalsFromTurn(turn);
        if (list.length) {
            lastProposal = turn;
            lastFalseClaim = false;
            const note = formatCardsNote(turn);
            if (note && assistantIndex >= 0) {
                out.splice(assistantIndex + 1, 0, { role: 'user', content: note });
                assistantIndex += 1;
            } else if (note) {
                out.push({ role: 'user', content: note });
            }
            continue;
        }
        if (turnOfferedProposing(turn, opts.proposingOffered)
            && claimsWithoutCard(turn.agentText, phrases)) {
            lastFalseClaim = true;
        }
    }
    const lastCards = lastProposal ? proposalsFromTurn(lastProposal) : [];
    const latest = lastCards.length ? lastCards[lastCards.length - 1] : null;
    if (latest && latest.undone) {
        out.push({ role: 'user', content: UNDONE_NOTE });
    }
    if (lastFalseClaim) {
        out.push({ role: 'user', content: FALSE_CLAIM_NOTE });
    }
    return out;
}

/**
 * Persist derived records once. Writes nothing for a turn with no proposals
 * unless a proposing tool was offered and the reply claimed a card.
 * @param {object} ctx
 * @param {{ turnModel: object, phrases?: string[], wasOffered?: Function }} deps
 * @returns {Promise<object[]>}
 */
export async function persistTurnProposals(ctx, deps = {}) {
    const turnModel = deps.turnModel;
    if (!turnModel || !ctx || !ctx.turn || !ctx.turn._id) {
        return [];
    }
    const latest = await turnModel.findById(ctx.turn._id);
    if (!latest) {
        return [];
    }
    const list = proposalsFromTurn(latest);
    if (list.length) {
        if (!Array.isArray(latest.proposals) || !latest.proposals.length) {
            await turnModel.setProposals(latest._id, list);
        }
        return list;
    }
    if (typeof deps.wasOffered !== 'function') {
        return [];
    }
    const offered = await deps.wasOffered(ctx);
    if (!offered) {
        return [];
    }
    if (claimsWithoutCard(latest.agentText, deps.phrases || DEFAULT_CLAIM_PHRASES)) {
        await turnModel.markProposingOffered(latest._id);
    }
    return [];
}

function pickProposal(list, proposalId) {
    if (!list.length) {
        return null;
    }
    if (proposalId) {
        return list.find((row) => row.id === proposalId) || null;
    }
    return list[list.length - 1];
}

/**
 * Derive if needed, then mark applied. Idempotent.
 * @returns {Promise<{ ok: boolean, code?: string, turn?: object }>}
 */
export async function applyProposalRecord(turnModel, turn, proposalId) {
    const list = proposalsFromTurn(turn);
    const target = pickProposal(list, proposalId);
    if (!target) {
        return { ok: false, code: 'AI_PROPOSAL_NOT_FOUND' };
    }
    if (!target.applied) {
        target.applied = true;
        target.appliedAt = new Date();
        target.undone = false;
        target.undoneAt = null;
    }
    const updated = await turnModel.setProposals(turn._id, list);
    return { ok: true, turn: updated };
}

/**
 * Derive if needed, then mark undone. Idempotent.
 * @returns {Promise<{ ok: boolean, code?: string, turn?: object }>}
 */
export async function undoProposalRecord(turnModel, turn, proposalId) {
    const list = proposalsFromTurn(turn);
    const target = pickProposal(list, proposalId);
    if (!target) {
        return { ok: false, code: 'AI_PROPOSAL_NOT_FOUND' };
    }
    if (!target.undone) {
        target.undone = true;
        target.undoneAt = new Date();
    }
    const updated = await turnModel.setProposals(turn._id, list);
    return { ok: true, turn: updated };
}

/**
 * Apply the site write first; record only on success.
 * @param {{ apply: Function, record: Function, proposal: object }} params
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
export async function applyThenRecord(params) {
    const proposal = params && params.proposal;
    if (!proposal || typeof params.apply !== 'function') {
        return { ok: false, error: 'applyProposal is missing.' };
    }
    try {
        const result = await params.apply(proposal);
        if (!result) {
            return { ok: false, error: 'Apply failed.' };
        }
        if (typeof params.record === 'function') {
            await params.record(proposal);
        }
        return { ok: true };
    } catch (error) {
        return { ok: false, error: error.message || 'Apply failed.' };
    }
}

/**
 * Undo the site write first; record only on success.
 * @param {{ undo: Function, record: Function, proposal: object }} params
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
export async function undoThenRecord(params) {
    const proposal = params && params.proposal;
    if (!proposal || typeof params.undo !== 'function') {
        return { ok: false, error: 'undoProposal is missing.' };
    }
    try {
        const result = await params.undo(proposal);
        if (!result) {
            return { ok: false, error: 'Undo failed.' };
        }
        if (typeof params.record === 'function') {
            await params.record(proposal);
        }
        return { ok: true };
    } catch (error) {
        return { ok: false, error: error.message || 'Undo failed.' };
    }
}

/**
 * @param {object} card
 * @param {{ running?: boolean, canWrite?: boolean }} flags
 * @returns {{ ok: boolean, reason?: string }}
 */
export function canApplyCard(card, flags = {}) {
    if (!card || card.applied || card.undone) {
        return { ok: false, reason: 'done' };
    }
    if (flags.running) {
        return { ok: false, reason: 'running' };
    }
    if (flags.canWrite === false) {
        return { ok: false, reason: 'readonly' };
    }
    return { ok: true };
}

export function pendingCards(list) {
    return (list || []).filter((row) => !row.applied && !row.undone);
}

// EOF plugins/ai-core/webapp/utils/proposals/index.js
