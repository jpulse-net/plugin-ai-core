# jPulse Docs / Installed Plugins / AI Core Plugin v1.0.9

A jPulse site gets an agent by configuring one rather than building one. Framework orientation (install, configure, what is possible): [AI Agent](/jpulse-docs/ai-agent).

## The simple case

Install (all three members auto-enable), then pick settings on Site Configuration → AI:

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

When the site deletes an object, erase its conversations in the same handler. Optional-chain so a disabled plugin is a no-op:

```js
await global.AiCore?.deleteByScope?.({ scopeType: 'doc', scopeId });
```

That wipes threads, turns, and staged images for **every** user on that object. It does not touch `aiUsage` — deleting an object is not a quota refund. Missing `scopeType` or `scopeId` throws `AI_BAD_ARGS`. An unknown scope returns `{ threads: 0, turns: 0, images: 0 }`.

Until you want a client-host tool, the transport stays HTTP. `GET /api/1/ai/capability` tells the panel which to use. Cancel is always `POST /api/1/ai/thread/:id/cancel`.

`ai-mock` answers without an API key. The bundled [Hello AI](/jpulse-docs/installed-plugins/hello-ai/README) plugin serves `/hello-ai/` — a scratch pad and both hosts. Disable that plugin to hide the demo; AI stays on. Copy the pattern. Do not import those tools.

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
| `timeoutMs` | site default | Omit to use Site Configuration → AI `defaultToolTimeoutMs` (10000). Set only when this tool needs a different budget |
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
    title:     'AI Agent',
    storageKey: 'aiAgent:window',
    cascade:   true,
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

`title` is the toolbar label. A non-empty string replaces the i18n default ("AI chat"). Create-time only. `storageKey`, `cascade`, and `group` are forwarded to `jPulse.UI.floatPanel.create()`; omit them and the shell defaults apply (`jp:floatPanel:<id>`, no cascade, group `default`). Cascade occupancy is every registered panel's `x` / `y`, not open-only and not same-group — a closed chat created on page load still occupies the default corner. `group` is only `mobile.exclusive`; forwarding it does nothing until exclusive is on. Any parseable JSON at `storageKey` skips cascade; a leftover blob without `x` / `y` / `w` / `h` / `open` still counts. Clear it once or rewrite it in that shape. The rest of the create bag is not spread into the shell. `create()` returns `destroy()`: it unregisters the float panel, closes the per-thread WebSocket (a no-op when the probe stayed on HTTP), and removes the body node (`create()` always appends one). A site only calls `destroy()`; it does not close `/api/1/ws/ai/:threadId` itself. A second call is a no-op. Compose paste of text stays in the textarea. Only clipboard files and images become chips. Attach a text source with drop or the (+) menu. The (+) attach menu opens to the right when the (+) is in the left half of the panel, and to the left when it is in the right half.

`get_source` and `list_sources` are owned by the panel. The client bridge asks a panel-internal provider before `adapter.toolData`, so a site with no adapter still gets working sources. Those two names are reserved: a site registration is refused, the panel's tools stay, and `/tools` shows the collision as withheld (`reserved`). It does not throw.

`handle.attachments()` is the one list a site walks: text sources first, then images. Every row has `kind: 'source' | 'image'`. `kind` is the family; `origin` is how it arrived (`file` / `url` / `paste`). `handle.attachmentFile(id)` returns the original `File` or `Blob` for either family, or `null` once the chip is gone. As of 1.0.7, `handle.sources()`, `handle.images()`, `handle.sourceFile()`, and `adapter.sourceAttachable` are gone — filter the one list:

```js
handle.attachments().filter((row) => row.kind === 'image')
```

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

The sample is a separate bundled plugin. Open [`/hello-ai/`](/hello-ai/) or disable it under Plugin management. Walkthrough, tools, `/pad`, and how to copy the pattern: [Hello AI guide](/jpulse-docs/installed-plugins/hello-ai/README).

## Attachments

Sources stay on this tab and this conversation. A reload clears the chips. What survives is a `sourceRefs` badge on the turn: the evidence that external text entered, not the text itself. Hover a chip for a tooltip; click it for name, origin, URL, type, and size, with copy. File, URL, and image chips use a type icon. The plus button wraps on the same row as the last chip. Pasting text into the compose box leaves it in the box. Clipboard files and images become chips. A text source is drop or the (+) menu, not compose paste.

The model never sees source text in the prompt. It sees a metadata manifest **on this turn's user message** and reads through `list_sources` / `get_source` — outline first, then a section or a character window. Filenames in earlier replies are stale. Text comes back inside `<<<SOURCE …>>>` markers. The safety fragment already calls that a quotation, not a request.

URL ingest is `POST /api/1/ai/source/fetch` on the framework `UrlFetch` helper. Host, size, and timeout caps are on Site Configuration → AI. A URL in the compose box offers to fetch it before the turn starts. The offer is hidden when the prompt is a question about the link rather than a request to read it. There is no agent-callable fetch. A listed URL is already ingested — the model reads that copy; it cannot fetch the live web. After a reload, chips are gone; ask the user to attach the file or URL again.

Document conversion is `POST /api/1/ai/source/convert`, a streaming route (`bodyMode: 'stream'`). The plugin calls `onDocumentConvertRegister` / `onDocumentConvert` and does not define them. A PDF drop on a bare install is a clean refusal naming what to install. Production nginx can buffer the whole body if the streaming location is not enabled; the route still works, with `client_max_body_size` as the outer gate.

The convert and image-stage routes accept up to 25 MB (`bodyLimit: '25mb'`; nginx default is 27M). The **real** cap is the admin field. The route is a ceiling, the setting is the cap, nginx is an outer gate — an admin only ever thinks about the middle one.

| Setting | Default | What it limits |
|---|---|---|
| `maxConvertBytes` | 26214400 (25 MB) | Input file for convert. Not the markdown after convert |
| `maxSourceChars` | 1000000 | Characters kept after convert or paste |
| `maxImageBytes` | 4194304 (4 MB) | Input file for image staging |

A setting above 25 MB is clamped. Conversion buffers the whole file in memory, so a busy site lowers `maxConvertBytes` rather than raising the heap. The panel refuses an oversize file before uploading it.

Images are `POST /api/1/ai/image/stage`, also streaming. Bytes park in Redis, scoped to the user, thread, and image id. The picture stays on the strip and is read on every send until the chip is cleared (✕, `/new`, thread switch, or reload). Send does not consume the chip or the mailbox. ✕ is `DELETE /api/1/ai/thread/:id/image/:imageId`; `/new` and thread switch are `DELETE /api/1/ai/thread/:id/images`. Redis is required for images; the capability probe reports them unavailable and the panel hides the affordance when Redis is down. Gating is at send, against the thread's model, not at attach against the site default.

A site tool that returns a picture puts it in `data.media`. The envelope lifts that field out of `data` so the tool-result message stays text. How many images one turn may pull in is an ordinary `budget` on the site's tool.

What a site adds through `onAiPromptFragment` is domain steering — where to put a document, what to extract. The framework owns the lifetime notice, the read tool, the manifest, URL messages, and the vision path.

`ai-mock` ships a Mock Vision row that names the images it was handed, so the Hello AI demo can show the gate with no API key.

## Admin

Site Configuration → AI holds the master switch, roles, models, quota, loop limits (including the default tool timeout), tool policy, retention, auto-title, site instructions, the false-claim phrase list, and the source / URL / convert / image caps. `/jpulse-plugins/ai-core.shtml` shows the live capability probe. Debug dumps stay on Admin → Plugins → ai-core.
