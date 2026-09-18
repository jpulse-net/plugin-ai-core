/**
 * @name            jPulse Framework / Plugins / AI Core / WebApp / Model / AI Thread
 * @tagline         Conversation threads
 * @description     One active thread per (scopeType, scopeId, createdBy); find-or-create lives here
 * @file            plugins/ai-core/webapp/model/aiThread.js
 * @version         1.0.6
 * @release         2026-09-17
 * @repository      https://github.com/jpulse-net/plugin-ai-core
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.20, Grok 4.6
 */

import { ObjectId } from 'mongodb';

export const AI_THREADS_INDEXES = [
    {
        key: { scopeType: 1, scopeId: 1, createdBy: 1 },
        unique: true,
        partialFilterExpression: { status: 'active' },
        name: 'aiThreads_active_scope_user'
    },
    {
        key: { createdBy: 1, updatedAt: -1 },
        name: 'aiThreads_owner_updated'
    }
];

function dbCollection() {
    const db = global.Database?.getDb?.();
    if (!db) {
        throw new Error('Database connection not available');
    }
    return db.collection('aiThreads');
}

class AiThreadModel {
    static getCollection() {
        return this._collection || dbCollection();
    }

    static useCollection(collection) {
        this._collection = collection || null;
    }

    static async ensureIndexes() {
        const collection = this.getCollection();
        for (const spec of AI_THREADS_INDEXES) {
            const { key, ...options } = spec;
            await collection.createIndex(key, options);
        }
    }

    /**
     * The only find-or-create. Every route keys by threadId after this.
     * @param {object} params
     * @returns {Promise<object>}
     */
    static async findOrCreateActive(params) {
        const collection = this.getCollection();
        const scopeType = String(params.scopeType || '');
        const scopeId = String(params.scopeId || '');
        const createdBy = String(params.createdBy || '');
        if (!scopeType || !scopeId || !createdBy) {
            throw new Error('scopeType, scopeId, and createdBy are required');
        }
        const existing = await collection.findOne({
            scopeType,
            scopeId,
            createdBy,
            status: 'active'
        });
        if (existing) {
            return existing;
        }
        const now = params.now || new Date();
        const doc = {
            scopeType,
            scopeId,
            createdBy,
            onBehalfOf: params.onBehalfOf || null,
            status: 'active',
            label: params.label || '',
            context: params.context || null,
            provider: params.provider || '',
            model: params.model || '',
            createdAt: now,
            updatedAt: now
        };
        try {
            const result = await collection.insertOne(doc);
            return { ...doc, _id: result.insertedId };
        } catch (error) {
            if (error?.code === 11000) {
                const raced = await collection.findOne({
                    scopeType,
                    scopeId,
                    createdBy,
                    status: 'active'
                });
                if (raced) {
                    return raced;
                }
            }
            throw error;
        }
    }

    /**
     * Start a new conversation: archive the active slot, then insert.
     * @param {object} params
     * @returns {Promise<object>}
     */
    static async startNew(params) {
        const collection = this.getCollection();
        const scopeType = String(params.scopeType || '');
        const scopeId = String(params.scopeId || '');
        const createdBy = String(params.createdBy || '');
        if (!scopeType || !scopeId || !createdBy) {
            throw new Error('scopeType, scopeId, and createdBy are required');
        }
        await collection.updateMany(
            { scopeType, scopeId, createdBy, status: 'active' },
            { $set: { status: 'archived', updatedAt: params.now || new Date() } }
        );
        return this.findOrCreateActive(params);
    }

    static async findById(id) {
        const collection = this.getCollection();
        return collection.findOne({ _id: coerceId(id) });
    }

    static async listForOwner(params) {
        const collection = this.getCollection();
        const query = {
            createdBy: String(params.createdBy || ''),
            scopeType: params.scopeType,
            scopeId: params.scopeId
        };
        if (params.status) {
            query.status = params.status;
        }
        let cursor = collection.find(query).sort({ updatedAt: -1 });
        const limit = Number(params.limit);
        if (Number.isFinite(limit) && limit > 0) {
            cursor = cursor.limit(Math.min(Math.floor(limit), 100));
        }
        return cursor.toArray();
    }

    static async rename(id, label) {
        return this.updateThread(id, { label });
    }

    static async archive(id) {
        return this._update(id, { status: 'archived', updatedAt: new Date() });
    }

    static async setProviderModel(id, provider, model) {
        return this.updateThread(id, { provider, model });
    }

    static async updateThread(id, fields = {}) {
        const set = { updatedAt: new Date() };
        if (fields.label !== undefined) {
            set.label = String(fields.label || '');
        }
        if (fields.provider !== undefined) {
            set.provider = String(fields.provider || '');
        }
        if (fields.model !== undefined) {
            set.model = String(fields.model || '');
        }
        return this._update(id, set);
    }

    static async touch(id) {
        return this._update(id, { updatedAt: new Date() });
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

function coerceId(id) {
    if (id && typeof id === 'object' && id._bsontype === 'ObjectId') {
        return id;
    }
    if (typeof id === 'string' && ObjectId.isValid(id)) {
        return new ObjectId(id);
    }
    return id;
}

export default AiThreadModel;

// EOF plugins/ai-core/webapp/model/aiThread.js
