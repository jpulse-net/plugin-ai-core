# jPulse Docs / Installed Plugins / AI Core Plugin v1.0.2

A jPulse site gets an agent by configuring one rather than building one.

## The simple case

Install (both members auto-enable), then pick settings on Site Configuration → AI:

```
npx jpulse plugin install @jpulse-net/plugin-ai-core
npx jpulse plugin install @jpulse-net/plugin-ai-anthropic
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

One line in the view:

```js
jPulse.ai.panel.create({ scopeType: 'doc', scopeId: docId });
```

The namespace is `jPulse.ai`, not `jPulse.plugins.aiCore`. That is deliberate: this is the site-facing client API, the mirror of `global.AiCore` on the server.

Until you want a client-host tool, the transport stays HTTP. `GET /api/1/ai/capability` tells the panel which to use. Cancel is always `POST /api/1/ai/thread/:id/cancel`.

`ai-mock` answers without an API key. Open `/hello-ai/` to see the panel, a scratch pad, and both hosts.

## Tool descriptor

Everything but `name`, `description`, and `schema` has a default.

| Field | Default | Notes |
|---|---|---|
| `host` | `server` | `client` runs in the origin tab over the WebSocket |
| `module` | `null` | Shared pure module name under `utils/ai-tools/` |
| `dataScope` | `call` | `call` or `turn`; only with `module` |
| `requires` | `null` | Named capability, e.g. `scope:read` |
| `mutates` | `false` | A flag. Direct writes are not propose/apply |
| `timeoutMs` | `5000` | |
| `group` | `read` | Admin policy grouping |
| `budget` | `null` | `{ key, max, countWhen, overMessage, overHint }` |
| `dedupeArgs` | `false` | Argument-identical calls in one turn are rejected |
| `exposeToMcp` | `true` | Ignored for `host: 'client'` |
| `owner` | stamped | Never supplied |

## Three tool shapes

| Shape | When to use |
|---|---|
| Server hook | Ordinary case. `onAiToolExecute` returns the result |
| Client module | Pure computation over browser-only data. `run(data, args)` in `utils/ai-tools/` |
| Client escape hatch | Side effects in the tab (DOM writes). `adapter.executeTool` — cannot be a module |

A module is one function and must stay pure: relative imports of siblings inside `utils/ai-tools/` only, no bare specifiers, no `import()`. `AiCore.scanToolModules()` is the one-line site test over `site/webapp/utils/ai-tools/`. A violation is withheld from the model, not a broken page.

Modules are served at `GET /api/1/ai/tool-module/:hash/:name.js` (`auth: user`, immutable cache). A stale hash is 409.

## Adapter

```js
jPulse.ai.panel.create({
    scopeType: 'doc',
    scopeId:   docId,
    adapter: {
        toolData(name) { … },
        describeScope() { … },
        describeContext() { … },
        describeTarget() { … },
        executeTool(name, args) { … }
    }
});
```

`adapter` may be omitted. `toolData` plus the three `describe*` methods are enough for a read-only agent. `executeTool` is the exception, not the interface.

## Slash commands

Resolved in the panel; none are sent to the model.

| Command | Action |
|---|---|
| `/help` | List commands |
| `/tools` | Offered tools (with host) and withheld tools (with reason) |
| `/model` | Show the current pair and the allowed list; `/model provider/model` sets the pair |
| `/new` | Start a conversation |
| `/cancel` | Cancel the running turn |

Typing `/` opens the picker. Enter runs the highlighted command and posts it into the transcript. Esc dismisses the picker. `//help` sends the literal text `/help`. `/help` can list page-specific examples passed as `examples` on `panel.create`.

The model is not in the panel header. `/model` is how you view and set it. Conversation title, switch, rename, and new conversation sit on one row under the title.

## Hello AI

`/hello-ai/` is a scratch pad. It never reaches the server. User-facing copy uses that one name, not draft or summary.

| Tool | Host | Path |
|---|---|---|
| `read_draft` | client | module `readDraft` |
| `append_draft` | client | `adapter.executeTool`, `mutates: true`, 3 writes per turn |
| `get_hello_clock` | server | `onAiToolExecute` |

`append_draft` writes immediately. That is not propose/apply — there is no Apply card. Propose/apply is a later, opt-in pattern.

Those tools register only when `scopeType` is `hello-ai`. Installing the bundle does not force a WebSocket on every other page.

Type the examples from `/help` in the panel. For `curl`, prefix `[mock:tool:<name>:<jsonArgs>]`. JSON arrays cannot be typed in the bracket form (`]` ends the marker); objects and scalars are fine. The structured `script` field is still accepted on a turn if a site wants to drive tools without the model choosing them.

## Still absent

Attachments, URL ingest, and vision; Apply cards and the false-claim guard.

## Admin

Site Configuration → AI holds the master switch, roles, models, quota, loop limits, tool policy, retention, auto-title, and site instructions. `/jpulse-plugins/ai-core.shtml` shows the live capability probe. Debug dumps stay on Admin → Plugins → ai-core.
