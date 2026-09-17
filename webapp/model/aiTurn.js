/**
 * @name            jPulse Framework / Plugins / AI Core / WebApp / Model / AI Turn
 * @tagline         Turn records
 * @description     One user message and everything the agent did in response
 * @file            plugins/ai-core/webapp/model/aiTurn.js
 * @version         1.0.2
 * @release         2026-09-17
 * @repository      https://github.com/jpulse-net/plugin-ai-core
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.20, Grok 4.6
 */

import { ObjectId } from 'mongodb';

export const AI_TURNS_INDEXES = [
    {
        key: { threadId: 1, seq: 1 },
        unique: true,
        name: 'aiTurns_thread_seq'
    },
    {
        key: { createdAt: 1 },
        name: 'aiTurns_created'
    }
];

function dbCollection() {
    const db = global.Database?.getDb?.();
    if (!db) {
        throw new Error('Database connection not available');
    }
    return db.collection('aiTurns');
}

class AiTurnModel {
    static getCollection() {
        return this._collection || dbCollection();
    }

    static useCollection(collection) {
        this._collection = collection || null;
    }

    static async ensureIndexes() {
        const collection = this.getCollection();
        for (const spec of AI_TURNS_INDEXES) {
            const { key, ...options } = spec;
            await collection.createIndex(key, options);
        }
    }

    static async nextSeq(threadId) {
        const collection = this.getCollection();
        const last = await collection.find({ threadId: String(threadId) })
            .sort({ seq: -1 })
            .limit(1)
            .toArray();
        return (last[0]?.seq || 0) + 1;
    }

    static async create(params) {
        const collection = this.getCollection();
        const now = params.now || new Date();
        const doc = {
            threadId: String(params.threadId),
            seq: params.seq,
            userText: params.userText || '',
            agentText: '',
            toolCalls: [],
            events: [],
            usage: emptyUsage(),
            cost: null,
            costUnknown: false,
            provider: params.provider || '',
            model: params.model || '',
            status: 'running',
            cancelRequested: false,
            createdBy: params.createdBy || '',
            onBehalfOf: params.onBehalfOf || null,
            createdAt: now,
            updatedAt: now
        };
        const result = await collection.insertOne(doc);
        return { ...doc, _id: result.insertedId };
    }

    static async findById(id) {
        return this.getCollection().findOne({ _id: coerceId(id) });
    }

    static async listByThread(threadId, limit = 50) {
        return this.getCollection()
            .find({ threadId: String(threadId) })
            .sort({ seq: 1 })
            .limit(limit)
            .toArray();
    }

    static async requestCancel(id) {
        return this._update(id, { cancelRequested: true, updatedAt: new Date() });
    }

    static async finalize(id, fields) {
        return this._update(id, { ...fields, updatedAt: new Date() });
    }

    static async appendEvent(id, event) {
        const collection = this.getCollection();
        await collection.updateOne(
            { _id: coerceId(id) },
            { $push: { events: event }, $set: { updatedAt: new Date() } }
        );
    }

    static async purgeOlderThan(cutoff) {
        const collection = this.getCollection();
        const result = await collection.deleteMany({ createdAt: { $lt: cutoff } });
        return result.deletedCount || 0;
    }

    static async _update(id, fields) {
        const collection = this.getCollection();
        const result = await collection.findOneAndUpdate(
            { _id: coerceId(id) },
            { $set: fields },
            { returnDocument: 'after' }
        );
        return result?.value || result || null;
    }
}

function emptyUsage() {
    return { tokensIn: 0, tokensOut: 0, cacheWrite: 0, cacheRead: 0 };
}

function coerceId(id) {
    if (id && typeof id === 'object' && id._bsontype === 'ObjectId') {
        return id;
    }
    if (typeof id === 'string' && ObjectId.isValid(id)) {
        return new ObjectId(id);
    }
    return id;
}

export default AiTurnModel;

// EOF plugins/ai-core/webapp/model/aiTurn.js
