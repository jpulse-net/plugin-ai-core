# jPulse Docs / Installed Plugins / AI Core Plugin v1.0.0

A jPulse site gets an agent by configuring one rather than building one. This page is the server half: tools, quota, turns, and HTTP. The chat panel, shared tool modules, propose/apply, and attachments arrive in later releases of this plugin.

## The simple case

Install (both members auto-enable), then pick settings on Site Configuration → AI:

```
npx jpulse plugin install @jpulse-net/plugin-ai
```

One site controller — this is the entire server side:

```js
export default class DocAgentController {

    static hooks = {
        onAiScopeResolve:   { handler: 'aiScope' },
        onAiToolRegister:   { handler: 'aiTools' },
        onAiToolExecute:    { handler: 'aiExecute' },
        onAiPromptFragment: { handler: 'aiPrompt' }
    };

    static async aiScope(ctx) {
        const doc = await DocModel.getById(ctx.scopeId);
        ctx.scope = {
            label:    doc.title,
            canRead:  DocModel.canRead(doc, ctx.actor.username),
            canWrite: DocModel.canWrite(doc, ctx.actor.username),
            nouns:    { item: 'section', container: 'document' }
        };
    }

    static async aiTools(ctx) {
        ctx.tools.push({
            name:        'get_outline',
            description: 'Return the outline of the document.',
            schema:      { type: 'object', properties: {} },
            requires:    'scope:read'
        });
    }

    static async aiExecute(ctx) {
        if (ctx.tool.name === 'get_outline') {
            ctx.result = await DocModel.getOutline(ctx.scopeId);
        }
    }

    static async aiPrompt(ctx) {
        ctx.fragments.push('You are helping the user edit a structured document.');
    }
}
```

Until the chat panel ships, start a thread and a turn over HTTP:

```
POST /api/1/ai/thread          { "scopeType": "doc", "scopeId": "<id>" }
POST /api/1/ai/thread/:id/turn { "text": "Summarize this document." }
POST /api/1/ai/thread/:id/cancel
```

The turn call is Server-Sent Events. Cancel is the third call — not closing the SSE connection. On this Node + POST+SSE path, HTTP close often fires when the JSON body is consumed, so treating it as “client gone” would abort every turn.

`ai-mock` answers without an API key. Prefix `[mock:text]`, `[mock:tools]`, `[mock:retry]`, `[mock:fatal]`, `[mock:slow]`, or `[mock:hang]` to pick a script.

`GET /api/1/ai/capability?scopeType=doc&scopeId=<id>` returns the transport (`http` when no client-host tool is offered), the offered tools, the model menu, and quota.

## Tool descriptor

Everything but `name`, `description`, and `schema` has a default.

| Field | Default | Notes |
|---|---|---|
| `host` | `server` | `client` is accepted and withheld from execution until the panel item |
| `requires` | `null` | Named capability, e.g. `scope:read` |
| `mutates` | `false` | |
| `timeoutMs` | `5000` | |
| `group` | `read` | Admin policy grouping |
| `budget` | `null` | `{ key, max, countWhen, overMessage, overHint }` |
| `dedupeArgs` | `false` | Argument-identical calls in one turn are rejected |
| `exposeToMcp` | `true` | Ignored for `host: 'client'` |
| `owner` | stamped | Never supplied |

## Four gates

In order, all server-side, all before execution:

1. Existence — unknown name → `AI_UNKNOWN_TOOL`
2. Capability — `requires` against the actor's capabilities for this scope
3. Admin policy — enabled unless the admin explicitly unchecked it (a new tool is on by default)
4. Turn budget — declarative counters and optional argument dedupe

`canRead` / `canWrite` from `onAiScopeResolve` are sugar for `scope:read` / `scope:write`. A finer per-scope rule is another capability name on the tool and in the handler — not a second tool list.

The offered list is computed by one function, every round. The turn loop, the capability probe, and later MCP `tools/list` all use it.

## Quota

A turn is charged to one subject, defaulting to the username. Caps are named dimensions over `day` and `month`. The shipped default is 200 requests/day and 400000 tokens/day. Enforcement is at turn start only: a turn that starts under its caps runs to completion even if it ends over. After SSE headers are sent, an exceeded cap is an `error` event with `AI_QUOTA_EXCEEDED`, not a JSON HTTP 429.

`ai-core` registers the shipped policy on `onAiQuotaCheck` / `onAiQuotaSettle` at priority 1000. A site handler at the default priority can return `{ subject, caps }` to replace it.

An unknown model records `null` cost, never zero. The usage page flags `costUnknown`.

## Actor

Authorization takes `{ username, roles, onBehalfOf, origin, scopeType, scopeId, req }`. `req` is optional. `onBehalfOf` is reserved and logged whenever it is set; nothing in this release populates it. Thread ownership follows it when present.

## Hook catalog

| Hook | Mode | onError |
|---|---|---|
| `onAiProviderRegister` | execute | continue |
| `onAiComplete` | executeForPlugin | abort |
| `onAiToolRegister` | execute | continue |
| `onAiToolExecute` | executeForPlugin | abort |
| `onAiToolData` | executeFirst | abort |
| `onAiScopeResolve` | executeFirst | abort |
| `onAiPromptFragment` | execute | continue |
| `onAiQuotaCheck` | executeFirst | abort |
| `onAiQuotaSettle` | execute | continue |
| `onAiTurnBefore` | execute | abort |
| `onAiTurnAfter` | execute | continue |

Four of these are what the simple case uses.

## Admin

Site Configuration → AI holds the master switch, allowed roles, default provider/model, quota caps, loop limits, tool policy, retention, auto-title, and site instructions. The first completed turn on an unlabeled thread gets a short label from the user text when auto-title is on.

Debug dumps stay on Admin → Plugins → ai-core so they are harder to leave on. That page also links to Site Configuration, AI usage, and this guide. When dumps are on, each round logs the assembled prompt and a clipped response line.

Admin → AI usage reports per-subject requests, tokens, and cost by period, with over-quota and unknown-cost flags. Daily and monthly rows are written on every settle.

## Later

Client-host tools and the floating chat panel, propose/apply, and attachments are not in 1.0.0. `host: 'client'` descriptors are accepted and withheld, not rejected.
