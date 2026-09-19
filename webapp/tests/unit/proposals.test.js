/**
 * @name            jPulse Framework / Plugins / AI Core / WebApp / Tests / Unit / Proposals
 * @tagline         Derive, persist, notes, endpoints, loop purity, panel helpers
 * @file            plugins/ai-core/webapp/tests/unit/proposals.test.js
 * @version         1.0.8
 * @release         2026-09-19
 * @repository      https://github.com/jpulse-net/plugin-ai-core
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.20, Grok 4.6
 */

import { afterEach, describe, expect, test } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import AiCoreController from '../../controller/aiCore.js';
import AiTurnModel from '../../model/aiTurn.js';
import { assemblePrompt, historyToMessages } from '../../utils/agent/prompt.js';
import { cacheSettings } from '../../utils/agent/settings.js';
import {
    applyProposalRecord,
    applyThenRecord,
    canApplyCard,
    claimsWithoutCard,
    compilePhrases,
    DEFAULT_CLAIM_PHRASES,
    FALSE_CLAIM_NOTE,
    formatCardsNote,
    mintProposalId,
    pendingCards,
    persistTurnProposals,
    PROPOSE_PROMPT,
    proposalsFromTurn,
    UNDONE_NOTE,
    undoProposalRecord,
    undoThenRecord
} from '../../utils/proposals/index.js';
import {
    AI_BUDGET_EXCEEDED,
    AI_DEDUPE,
    clearTools,
    createBudgetState,
    executeTool,
    registerTools
} from '../../utils/tools/index.js';
import { memoryCollection, testActor } from './helpers.js';

const schema = { type: 'object', properties: {} };

function turnWithCall(extra = {}) {
    return {
        _id: extra._id || 'turn-1',
        userText: extra.userText || 'Rewrite it.',
        agentText: extra.agentText || 'Here is a proposal.',
        createdBy: extra.createdBy || 'jdoe',
        proposingOffered: extra.proposingOffered,
        proposals: extra.proposals,
        toolCalls: extra.toolCalls || [{
            id: 'call_1',
            name: 'propose_draft_rewrite',
            args: { text: 'Hello' },
            result: {
                ok: true,
                data: {
                    proposal: {
                        kind: 'rewrite',
                        preview: 'Replace old → Hello',
                        payload: { text: 'Hello', expectedChars: 3 }
                    }
                }
            }
        }]
    };
}

afterEach(() => {
    clearTools();
    cacheSettings(null);
    AiTurnModel.useCollection(null);
});

describe('derivation', () => {
    test('proposals come from toolCalls in call order with stable ids', () => {
        const turn = {
            _id: 't1',
            toolCalls: [
                {
                    id: 'c1',
                    result: { ok: true, data: { proposal: { kind: 'rewrite', preview: 'one' } } }
                },
                {
                    id: 'c2',
                    result: { ok: true, data: { proposal: { kind: 'rewrite', preview: 'two' } } }
                }
            ]
        };
        const first = proposalsFromTurn(turn);
        const again = proposalsFromTurn(turn);
        expect(first.map(row => row.id)).toEqual([
            mintProposalId('t1', 'c1'),
            mintProposalId('t1', 'c2')
        ]);
        expect(again.map(row => row.id)).toEqual(first.map(row => row.id));
        expect(first[0].preview).toBe('one');
        expect(first[1].preview).toBe('two');
    });

    test('persisted array wins over toolCalls', () => {
        const turn = {
            _id: 't1',
            proposals: [{
                id: 'kept',
                kind: 'rewrite',
                preview: 'persisted',
                payload: {},
                applied: true
            }],
            toolCalls: [{
                id: 'c1',
                result: { ok: true, data: { proposal: { kind: 'rewrite', preview: 'derived' } } }
            }]
        };
        const list = proposalsFromTurn(turn);
        expect(list).toHaveLength(1);
        expect(list[0].id).toBe('kept');
        expect(list[0].applied).toBe(true);
    });

    test('non-ok results and results without data.proposal are ignored', () => {
        const turn = {
            _id: 't1',
            toolCalls: [
                { id: 'c1', result: { ok: false, data: { proposal: { kind: 'rewrite' } } } },
                { id: 'c2', result: { ok: true, data: { appended: 3 } } },
                { id: 'c3', result: { ok: true, data: { proposal: { kind: 'rewrite', preview: 'ok' } } } }
            ]
        };
        const list = proposalsFromTurn(turn);
        expect(list).toHaveLength(1);
        expect(list[0].id).toBe(mintProposalId('t1', 'c3'));
    });
});

describe('persist and endpoints', () => {
    test('persist writes derived records once and is idempotent', async () => {
        const collection = memoryCollection();
        AiTurnModel.useCollection(collection);
        const created = await AiTurnModel.create({
            threadId: 'th1',
            seq: 1,
            userText: 'Go',
            createdBy: 'jdoe'
        });
        await AiTurnModel.finalize(created._id, {
            agentText: 'Proposed.',
            toolCalls: turnWithCall({ _id: created._id }).toolCalls,
            status: 'completed'
        });
        const ctx = { turn: { _id: created._id }, actor: testActor() };
        const first = await persistTurnProposals(ctx, { turnModel: AiTurnModel });
        const second = await persistTurnProposals(ctx, { turnModel: AiTurnModel });
        expect(first).toHaveLength(1);
        expect(second).toHaveLength(1);
        const stored = await AiTurnModel.findById(created._id);
        expect(stored.proposals).toHaveLength(1);
        expect(stored.proposals[0].id).toBe(mintProposalId(created._id, 'call_1'));
    });

    test('read-only persist writes nothing', async () => {
        const collection = memoryCollection();
        AiTurnModel.useCollection(collection);
        const created = await AiTurnModel.create({
            threadId: 'th1',
            seq: 1,
            userText: 'Hi',
            createdBy: 'jdoe'
        });
        await AiTurnModel.finalize(created._id, {
            agentText: 'Hello. Click Apply.',
            toolCalls: [],
            status: 'completed'
        });
        await persistTurnProposals(
            { turn: { _id: created._id }, actor: testActor() },
            { turnModel: AiTurnModel, wasOffered: async () => false }
        );
        const stored = await AiTurnModel.findById(created._id);
        expect(stored.proposals).toEqual([]);
        expect(stored.proposingOffered).toBeUndefined();
    });

    test('false-claim persist marks proposingOffered when a proposing tool was offered', async () => {
        const collection = memoryCollection();
        AiTurnModel.useCollection(collection);
        const created = await AiTurnModel.create({
            threadId: 'th1',
            seq: 1,
            userText: 'Rewrite',
            createdBy: 'jdoe'
        });
        await AiTurnModel.finalize(created._id, {
            agentText: 'I have proposed the change. Click Apply.',
            toolCalls: [],
            status: 'completed'
        });
        await persistTurnProposals(
            { turn: { _id: created._id }, actor: testActor() },
            { turnModel: AiTurnModel, wasOffered: async () => true }
        );
        const stored = await AiTurnModel.findById(created._id);
        expect(stored.proposals).toEqual([]);
        expect(stored.proposingOffered).toBe(true);
    });

    test('apply is idempotent and self-heals from toolCalls', async () => {
        const collection = memoryCollection();
        AiTurnModel.useCollection(collection);
        const created = await AiTurnModel.create({
            threadId: 'th1',
            seq: 1,
            createdBy: 'jdoe'
        });
        const raw = turnWithCall({ _id: created._id });
        await AiTurnModel.finalize(created._id, {
            agentText: 'Proposed.',
            toolCalls: raw.toolCalls,
            status: 'completed'
        });
        const turn = await AiTurnModel.findById(created._id);
        const id = mintProposalId(created._id, 'call_1');
        const first = await applyProposalRecord(AiTurnModel, turn, id);
        const again = await applyProposalRecord(AiTurnModel, first.turn, id);
        expect(first.ok).toBe(true);
        expect(again.ok).toBe(true);
        expect(again.turn.proposals[0].applied).toBe(true);
        const missing = await applyProposalRecord(AiTurnModel, again.turn, 'nope');
        expect(missing.code).toBe('AI_PROPOSAL_NOT_FOUND');
    });

    test('undo after apply', async () => {
        const collection = memoryCollection();
        AiTurnModel.useCollection(collection);
        const created = await AiTurnModel.create({
            threadId: 'th1',
            seq: 1,
            createdBy: 'jdoe'
        });
        const raw = turnWithCall({ _id: created._id });
        await AiTurnModel.finalize(created._id, {
            agentText: 'Proposed.',
            toolCalls: raw.toolCalls,
            status: 'completed'
        });
        const turn = await AiTurnModel.findById(created._id);
        const id = mintProposalId(created._id, 'call_1');
        await applyProposalRecord(AiTurnModel, turn, id);
        const undone = await undoProposalRecord(AiTurnModel, await AiTurnModel.findById(created._id), id);
        expect(undone.turn.proposals[0].undone).toBe(true);
        expect(undone.turn.proposals[0].applied).toBe(true);
    });

    test('controller ownership helper refuses a non-owner and an unknown turn', async () => {
        const collection = memoryCollection();
        AiTurnModel.useCollection(collection);
        const created = await AiTurnModel.create({
            threadId: 'th1',
            seq: 1,
            createdBy: 'jdoe'
        });
        const owner = await AiCoreController._ownedTurn({}, testActor(), created._id);
        expect(owner._id).toBe(created._id);
        const other = await AiCoreController._ownedTurn({}, testActor({ username: 'other' }), created._id);
        expect(other).toBe(false);
        const missing = await AiCoreController._ownedTurn({}, testActor(), 'missing-turn');
        expect(missing).toBe(null);
    });
});

describe('history notes', () => {
    test('cards note lists applied / not applied / undone', () => {
        const note = formatCardsNote({
            proposals: [
                { id: 'a', preview: 'First', applied: true },
                { id: 'b', preview: 'Second' },
                { id: 'c', preview: 'Third', applied: true, undone: true }
            ]
        });
        expect(note).toContain('"First" applied');
        expect(note).toContain('"Second" not applied');
        expect(note).toContain('"Third" undone');
    });

    test('only the latest proposal undo produces the undone note', () => {
        const messages = historyToMessages([
            {
                userText: 'One',
                agentText: 'Proposed one.',
                proposals: [{ id: 'old', preview: 'Old', applied: true, undone: true }]
            },
            {
                userText: 'Two',
                agentText: 'Proposed two.',
                proposals: [{ id: 'new', preview: 'New', applied: true }]
            }
        ], 10000);
        expect(messages.some(row => row.content === UNDONE_NOTE)).toBe(false);
        const undone = historyToMessages([
            {
                userText: 'One',
                agentText: 'Proposed one.',
                proposals: [{ id: 'old', preview: 'Old', applied: true }]
            },
            {
                userText: 'Two',
                agentText: 'Proposed two.',
                proposals: [{ id: 'new', preview: 'New', applied: true, undone: true }]
            }
        ], 10000);
        expect(undone.some(row => row.content === UNDONE_NOTE)).toBe(true);
        expect(undone.filter(row => row.content && String(row.content).includes('Cards from that turn'))).toHaveLength(2);
    });

    test('false-claim note fires on a configured phrase and stays silent for a read-only agent', () => {
        const claiming = {
            userText: 'Rewrite',
            agentText: 'I have proposed the change. Click Apply.',
            proposingOffered: true
        };
        const withClaim = historyToMessages([claiming], 10000);
        expect(withClaim.some(row => row.content === FALSE_CLAIM_NOTE)).toBe(true);

        const readOnly = historyToMessages([{
            userText: 'Hi',
            agentText: 'I have proposed the change. Click Apply.'
        }], 10000);
        expect(readOnly.some(row => row.content === FALSE_CLAIM_NOTE)).toBe(false);
        expect(readOnly.some(row => String(row.content || '').startsWith('[system]'))).toBe(false);
    });

    test('configured phrases replace the default, including a regex', () => {
        expect(claimsWithoutCard('Please APPLY now', DEFAULT_CLAIM_PHRASES)).toBe(false);
        const phrases = ['/please apply/i'];
        expect(claimsWithoutCard('Please APPLY now', phrases)).toBe(true);
        expect(compilePhrases(['/broken(/']).length).toBe(1);
        const custom = historyToMessages([{
            userText: 'Go',
            agentText: 'Ready for your review.',
            proposingOffered: true
        }], 10000, { phrases: ['Ready for your review'] });
        expect(custom.some(row => row.content === FALSE_CLAIM_NOTE)).toBe(true);
    });

    test('assemblePrompt adds the propose sentence only when a proposing tool is offered', async () => {
        const withPropose = await assemblePrompt({
            tools: [{ name: 'propose_draft_rewrite', proposes: true }],
            withheld: []
        });
        expect(withPropose.system).toContain(PROPOSE_PROMPT);
        const readOnly = await assemblePrompt({
            tools: [{ name: 'read_draft' }],
            withheld: []
        });
        expect(readOnly.system).not.toContain(PROPOSE_PROMPT);
    });
});

describe('budgets and descriptor', () => {
    test('fourth propose is refused with the tool overMessage', async () => {
        registerTools({
            name: 'propose_draft_rewrite',
            description: 'Propose',
            schema,
            proposes: true,
            budget: {
                key: 'proposals',
                max: 3,
                overMessage: 'This turn already made %MAX% proposals.'
            }
        }, 'site');
        const budgetState = createBudgetState();
        const hooks = {
            async executeForPlugin(_name, _plugin, ctx) {
                ctx.result = { ok: true, data: { proposal: { kind: 'rewrite' } } };
            }
        };
        for (let i = 0; i < 3; i += 1) {
            const ok = await executeTool({
                name: 'propose_draft_rewrite',
                args: { text: String(i) },
                actor: testActor(),
                budgetState,
                hookManager: hooks
            });
            expect(ok.ok).toBe(true);
        }
        const fourth = await executeTool({
            name: 'propose_draft_rewrite',
            args: { text: '4' },
            actor: testActor(),
            budgetState,
            hookManager: hooks
        });
        expect(fourth.code).toBe(AI_BUDGET_EXCEEDED);
        expect(fourth.error).toMatch(/3/);
    });

    test('identical propose args are deduped', async () => {
        registerTools({
            name: 'propose_draft_rewrite',
            description: 'Propose',
            schema,
            proposes: true,
            dedupeArgs: true
        }, 'site');
        const budgetState = createBudgetState();
        const hooks = {
            async executeForPlugin(_name, _plugin, ctx) {
                ctx.result = { ok: true, data: { proposal: { kind: 'rewrite' } } };
            }
        };
        const first = await executeTool({
            name: 'propose_draft_rewrite',
            args: { text: 'same' },
            actor: testActor(),
            budgetState,
            hookManager: hooks
        });
        const second = await executeTool({
            name: 'propose_draft_rewrite',
            args: { text: 'same' },
            actor: testActor(),
            budgetState,
            hookManager: hooks
        });
        expect(first.ok).toBe(true);
        expect(second.code).toBe(AI_DEDUPE);
    });
});

describe('loop purity', () => {
    test('turnLoop.js contains no proposal machinery', () => {
        const text = fs.readFileSync(
            path.resolve(process.cwd(), 'plugins/ai-core/webapp/utils/agent/turnLoop.js'),
            'utf8'
        );
        expect(text).not.toMatch(/proposalId/);
        expect(text).not.toMatch(/claimsApplyWithoutProposal|claimsWithoutCard/);
        expect(text).not.toMatch(/propose_/);
        expect(text).not.toMatch(/proposalsFromTurn|annotateHistory|formatCardsNote/);
        expect(text).not.toMatch(/\bproposes\s*:/);
    });
});

describe('panel helpers', () => {
    test('apply calls the adapter before it records', async () => {
        const order = [];
        const ok = await applyThenRecord({
            proposal: { id: 'p1' },
            apply: async () => {
                order.push('apply');
                return true;
            },
            record: async () => {
                order.push('record');
            }
        });
        expect(ok.ok).toBe(true);
        expect(order).toEqual(['apply', 'record']);
    });

    test('adapter failure posts nothing and surfaces the error', async () => {
        let recorded = false;
        const failed = await applyThenRecord({
            proposal: { id: 'p1' },
            apply: async () => false,
            record: async () => {
                recorded = true;
            }
        });
        expect(failed.ok).toBe(false);
        expect(recorded).toBe(false);
        const threw = await applyThenRecord({
            proposal: { id: 'p1' },
            apply: async () => {
                throw new Error('site write failed');
            },
            record: async () => {
                recorded = true;
            }
        });
        expect(threw.error).toBe('site write failed');
        expect(recorded).toBe(false);
    });

    test('two pending cards and apply-all stop on first failure', async () => {
        const cards = [
            { id: 'a', applied: false, undone: false },
            { id: 'b', applied: false, undone: false }
        ];
        expect(pendingCards(cards)).toHaveLength(2);
        expect(canApplyCard(cards[0], { running: true }).reason).toBe('running');
        expect(canApplyCard(cards[0], { canWrite: false }).reason).toBe('readonly');
        const applied = [];
        for (const card of pendingCards(cards)) {
            const result = await applyThenRecord({
                proposal: card,
                apply: async (row) => row.id !== 'b',
                record: async (row) => applied.push(row.id)
            });
            if (!result.ok) {
                break;
            }
        }
        expect(applied).toEqual(['a']);
    });

    test('undo records only after a successful adapter undo', async () => {
        let recorded = false;
        const ok = await undoThenRecord({
            proposal: { id: 'p1' },
            undo: async () => true,
            record: async () => {
                recorded = true;
            }
        });
        expect(ok.ok).toBe(true);
        expect(recorded).toBe(true);
    });

    test('a read-only agent has no card chrome inputs', () => {
        expect(pendingCards([])).toEqual([]);
        expect(claimsWithoutCard('Please apply this idea.', DEFAULT_CLAIM_PHRASES)).toBe(false);
    });
});

// EOF plugins/ai-core/webapp/tests/unit/proposals.test.js
