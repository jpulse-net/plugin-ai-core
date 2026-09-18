# jPulse Docs / Installed Plugins / AI Core Plugin v1.0.5

A jPulse site gets an agent by configuring one rather than building one. Framework orientation (install, configure, what is possible): [AI Agent](/jpulse-docs/ai-agent).

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
        describeContext() { … },
        describeTarget() { … },
        contextOptions() { … },
        executeTool(name, args) { … },
        renderProposalPreview(proposal) { … },
        applyProposal(proposal) { … },
        undoProposal(proposal) { … }
    }
});
```

`adapter` may be omitted. `toolData` plus `describeContext` / `describeTarget` are enough for a read-only agent. Scope labels belong on `onAiScopeResolve`, not the adapter. `executeTool` is the exception, not the interface. The three `*Proposal` methods are used only when a registered tool declares `proposes: true`. `contextOptions()` is optional: implement it and the panel shows a context row and `/context`; omit it and neither appears.

`get_source` and `list_sources` are owned by the panel. The client bridge asks a panel-internal provider before `adapter.toolData`, so a site with no adapter still gets working sources. Those two names are reserved.

`handle.sources()` returns metadata for the chips on this tab. `handle.sourceFile(id)` returns the original `File` or `Blob` the user dropped. `adapter.sourceAttachable(source)` is optional and decides which of those the site would accept on one of its own objects.

`renderProposalPreview` may return a DOM node, or a string that the panel escapes as text. `applyProposal` and `undoProposal` perform the site's real write and resolve truthy on success. The panel records the outcome after the adapter resolves, so a failed write never marks a card applied.

## Slash commands

Resolved in the panel; none are sent to the model. Omit `commands` and the panel uses `jPulse.ai.commands.defaults`. Pass `commands` and you own the complete list: a string names a framework implementation, an object adds or overrides, and the last entry with a given name wins.

| Command | Action |
|---|---|
| `/help` | List commands, then the site's `examples` |
| `/tools` | Offered tools (with host) and withheld tools (with reason) |
| `/model` | Show the current pair and the allowed list; `/model provider/model` sets the pair. Always listed |
| `/new` | Start a conversation. Alias `/clear` |
| `/cancel` | Cancel the running turn, or say that none is running |
| `/conversations` | List the last 20; `/conversations 3` opens one. Alias `/resume` |
| `/quota` | Remaining caps from the capability probe. Hidden when the probe has no rows |
| `/sources` | Attached sources and images. Hidden when sources and images are disabled |
| `/status` | Conversation count, turns in the current conversation, transport, thread, pair, and idle or running. Always listed |
| `/context` | Current context, target, and options. Hidden unless `adapter.contextOptions` exists |

Typing `/` opens the picker. Enter runs the highlighted command and posts it into the transcript. Esc dismisses the picker. `//help` sends the literal text `/help`. A site command is `{ name, aliases, hint, when, hidden, run }`. `run` may be async and may return a string, a node, or `null` when it drew its own UI. `ctx.framework()` runs the framework implementation of that name when one exists.

`examples` is the content slot inside `/help`. `[[Label]]` anywhere in a row is a clickable span that fills the compose box with that text. Text after the brackets stays as a note: `[[Shorten it]] — propose a shorter rewrite`. A single `[docs]` stays plain text. `/help` command names, `/model` pairs, and `/conversations` rows use the same links so a click puts `/status`, `/model provider/model`, or `/conversations 3` in the compose box. Clicking never sends.

The model is not in the panel header. `/model` is how you view and set it. Conversation title, switch, rename, and new conversation sit on one row under the title.

## Panel regions

The framework owns order and placement. A site fills named anchors: `header`, `transcriptTop`, `transcriptBottom`, `composeAbove`, `composeBelow`. A region is `{ name, anchor, priority, render, on }`. `render` returns a DOM node, a string the panel escapes as text, or `null` to hide. `handle.regions.refresh(name)` re-renders one region, or every region when the name is omitted. Existing chrome (notice, intercept, strip, Apply cards) is not a region.

## Context row

`adapter.contextOptions()` returns `[{ value, label, unavailable? }]`. The panel remembers the selected value per thread in the tab. `describeContext(value)` turns it into the sentence on the turn. `handle.context` is `{ get, set, refresh }` so a page gesture can keep the select in sync. An `unavailable` option stays selectable and is never auto-picked.

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

`/help` lists clickable examples that fill the compose box. `/pad` prints the pad size; `/padreset` (hidden) restores the demo text. A character count sits below the compose box. For `curl`, prefix `[mock:tool:<name>:<jsonArgs>]`. JSON arrays cannot be typed in the bracket form (`]` ends the marker); objects and scalars are fine. The structured `script` field is still accepted on a turn if a site wants to drive tools without the model choosing them.

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
