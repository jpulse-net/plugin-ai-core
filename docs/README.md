# jPulse Docs / Installed Plugins / AI Core Plugin v1.0.4

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
| `proposes` | `false` | This call creates an Apply card. The call itself writes nothing |
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
        executeTool(name, args) { … },
        renderProposalPreview(proposal) { … },
        applyProposal(proposal) { … },
        undoProposal(proposal) { … }
    }
});
```

`adapter` may be omitted. `toolData` plus the three `describe*` methods are enough for a read-only agent. `executeTool` is the exception, not the interface. The three `*Proposal` methods are used only when a registered tool declares `proposes: true`.

`get_source` and `list_sources` are owned by the panel. The client bridge asks a panel-internal provider before `adapter.toolData`, so a site with no adapter still gets working sources. Those two names are reserved.

`handle.sources()` returns metadata for the chips on this tab. `handle.sourceFile(id)` returns the original `File` or `Blob` the user dropped. `adapter.sourceAttachable(source)` is optional and decides which of those the site would accept on one of its own objects.

`renderProposalPreview` may return a DOM node, or a string that the panel escapes as text. `applyProposal` and `undoProposal` perform the site's real write and resolve truthy on success. The panel records the outcome after the adapter resolves, so a failed write never marks a card applied.

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

## Propose and apply

A proposing tool does not write. It returns a proposal; the user applies it.

```js
{
    name:     'propose_draft_rewrite',
    host:     'client',
    module:   'proposeRewrite',
    requires: 'scope:write',
    proposes: true,
    dedupeArgs: true,
    budget:   { key: 'proposals', max: 3, overMessage: 'This turn already made %MAX% proposals.' }
}
```

A successful result carries `data.proposal = { kind, payload, preview }`. `kind` is a label. `payload` is whatever the site needs at apply time and is never interpreted by the plugin. The plugin mints the card id from the turn id and the tool-call id.

`POST /api/1/ai/turn/:id/applied` and `/undone` record that the user applied or undid a card. They check turn ownership and are idempotent. They do not authorize the write — that lives on the site's own authenticated API, which `adapter.applyProposal` calls. Put an idempotency token on that site call if the write needs one.

Cap and duplicate refusal are declarations on the tool (`budget` and `dedupeArgs`), not a separate setting. Several proposing calls in one turn each get their own card; every pending card stays applyable (Apply all runs them in order).

The false-claim guard is a phrase list on Site Configuration → AI. Each line is a plain phrase or `/regex/flags`. A reply that matches, in a turn that offered a proposing tool and created no card, gets a note in the panel and a history note on the next prompt. Stored reply text is never rewritten. A read-only agent that registers no proposing tool never sees a record, a card, or a note.

Use a direct `mutates: true` write when the user is looking at the change and can undo it by hand. Use propose/apply when the change needs consent first.

## Hello AI

`/hello-ai/` is a scratch pad. It never reaches the server. User-facing copy uses that one name, not draft or summary.

| Tool | Host | Path |
|---|---|---|
| `read_draft` | client | module `readDraft` |
| `propose_draft_rewrite` | client | module `proposeRewrite`, `proposes: true`, 3 proposals per turn |
| `append_draft` | client | `adapter.executeTool`, `mutates: true`, 3 writes per turn |
| `get_hello_clock` | server | `onAiToolExecute` |

`append_draft` writes immediately. There is no Apply card; the undo is the textarea in front of you. `propose_draft_rewrite` is the other shape: it is a pure module, it writes nothing, and Apply / Undo sit on the card.

Those tools register only when `scopeType` is `hello-ai`. Installing the bundle does not force a WebSocket on every other page.

Type the examples from `/help` in the panel. For `curl`, prefix `[mock:tool:<name>:<jsonArgs>]`. JSON arrays cannot be typed in the bracket form (`]` ends the marker); objects and scalars are fine. The structured `script` field is still accepted on a turn if a site wants to drive tools without the model choosing them.

## Attachments

Sources stay on this tab and this conversation. A reload clears the chips. What survives is a `sourceRefs` badge on the turn: the evidence that external text entered, not the text itself. Hover a chip for a tooltip; click it for name, origin, URL, type, and size, with copy. File, URL, and image chips use a type icon. The plus button wraps on the same row as the last chip.

The model never sees source text in the prompt. It sees a metadata manifest and reads through `list_sources` / `get_source` — outline first, then a section or a character window. Text comes back inside `<<<SOURCE …>>>` markers. The safety fragment already calls that a quotation, not a request.

URL ingest is `POST /api/1/ai/source/fetch` on the framework `UrlFetch` helper. Host, size, and timeout caps are on Site Configuration → AI. A URL in the compose box offers to fetch it before the turn starts. The offer is hidden when the prompt is a question about the link rather than a request to read it. There is no agent-callable fetch. A listed URL is already ingested — the model reads that copy; it cannot fetch the live web. After a reload, chips are gone; ask the user to attach the file or URL again.

Document conversion is `POST /api/1/ai/source/convert`, a streaming route (`bodyMode: 'stream'`). The plugin calls `onDocumentConvertRegister` / `onDocumentConvert` and does not define them. A PDF drop on a bare install is a clean refusal naming what to install. Production nginx can buffer the whole body if the streaming location is not enabled; the route still works, with `client_max_body_size` as the outer gate.

Images are `POST /api/1/ai/image/stage`, also streaming. Bytes park in Redis, scoped to the user, thread, and image id, and are read once at send. Redis is required for images; the capability probe reports them unavailable and the panel hides the affordance when Redis is down. Gating is at send, against the thread's model, not at attach against the site default.

A site tool that returns a picture puts it in `data.media`. The envelope lifts that field out of `data` so the tool-result message stays text. How many images one turn may pull in is an ordinary `budget` on the site's tool.

What a site adds through `onAiPromptFragment` is domain steering — where to put a document, what to extract. The framework owns the lifetime notice, the read tool, the manifest, URL messages, and the vision path.

`ai-mock` ships a Mock Vision row that names the images it was handed, so `/hello-ai/` can demonstrate the gate with no API key.

## Admin

Site Configuration → AI holds the master switch, roles, models, quota, loop limits, tool policy, retention, auto-title, site instructions, the false-claim phrase list, and the source / URL / image caps. `/jpulse-plugins/ai-core.shtml` shows the live capability probe. Debug dumps stay on Admin → Plugins → ai-core.
