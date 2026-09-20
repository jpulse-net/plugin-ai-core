# jPulse Framework / Plugins / AI Core Plugin v1.0.12

AI agent for a jPulse site: tools, turns, quota, HTTP/SSE or WebSocket, `jPulse.ai.panel`, attachments, and propose/apply. Ships as `@jpulse-net/plugin-ai-core` together with `ai-mock` and the `hello-ai` sample.

Requires jPulse Framework >= 2.0.5 (`jPulse.ws` queues a send until the socket is open).

## Install

```bash
npx jpulse plugin install @jpulse-net/plugin-ai-core
```

That one command installs `ai-core`, `ai-mock`, and `hello-ai`. All three have `autoEnable: true`. Set the master switch, roles, and quota on Site Configuration → AI. Usage is Admin → AI usage. Plugin-local settings (including debug dumps, off by default) are on Admin → Plugins → ai-core. Live capability is `/jpulse-plugins/ai-core.shtml`. Open `/hello-ai/` to confirm the install (no API key). Disable the Hello AI plugin to hide that demo without turning off AI.

`ai-core` is the **primary**. It names `ai-mock` and `hello-ai` in `bundle.members`. All three share `@jpulse-net/plugin-ai-core`. The bump-version file list lives only here. Companions have no `webapp/bump-version.conf`, and their `package.json` is a publish guard only — staging strips it from the packaged copy.

This `package.json` is wired for a plain `npm publish`: `"files": ["plugins"]` plus `prepack`/`postpack` scripts that stage and unstage the bundle members.

## Bump and publish

From this directory only:

```bash
cd plugins/ai-core
node ../../bin/bump-version.js 1.0.1
npx jpulse plugin publish ai-core --dry-run
npx jpulse plugin publish ai-core --pack-to ./tmp/plugin-ai-core
```

A bump or publish run from `plugins/ai-mock/` or `plugins/hello-ai/` is refused and names `ai-core`.

Plain `npm pack` from this directory (same shape as `npm publish`):

```bash
cd plugins/ai-core
npm pack
tar -tzf jpulse-net-plugin-ai-core-1.0.1.tgz
rm jpulse-net-plugin-ai-core-1.0.1.tgz
```

The listing must show `package/package.json`, `package/plugins/ai-core/`, `package/plugins/ai-mock/`, and `package/plugins/hello-ai/`, with no `package/plugin.json` and no companion `package.json`. Afterwards this directory must have no `plugins/` subdirectory.

## What a site writes

One controller and one line in the view:

```js
jPulse.ai.panel.create({ scopeType: 'doc', scopeId: docId });
```

The namespace is `jPulse.ai`. A site with no client-host tool stays on HTTP. Cancel is `POST /api/1/ai/thread/:id/cancel`. The bundled Hello AI plugin serves `/hello-ai/` (no API key). Drop a file or paste an image on the panel to attach a source or try vision. Copy that pattern; do not import the sample tools. Walkthrough: [Hello AI guide](/jpulse-docs/installed-plugins/hello-ai/README).

The panel accepts site `regions` at named anchors and a complete `commands` list (`jPulse.ai.commands.defaults` is the spread). `/help` command names and examples may be clickable `[[label]]` rows; text after the brackets is a note. `adapter.contextOptions()` shows a context row; `handle.context` keeps it in sync with the page. Sites that implemented `describeScope` on the adapter can delete it — scope labels live on `onAiScopeResolve`. Chips are `handle.attachments()` (`kind: 'source' | 'image'`); `handle.attachmentFile(id)` returns the original file. A chip ⋯ **Attach** appears only when `adapter.attach` exists; `canAttach` may disable it. That write is not a proposal. A deleted object is `AiCore.deleteByScope({ scopeType, scopeId })`. `create({ title })` sets the toolbar label; `handle.setTitle` restamps it. `storageKey`, `cascade`, `group`, `mobile`, `defaults`, `minWidth`, and `minHeight` are forwarded to the float panel (`group` is `mobile.exclusive` only). `create()` returns `destroy()`, which cancels a running turn, unregisters the float panel, closes the per-thread WebSocket, and removes the body node. `/new` and a conversation switch confirm when chips are attached (switch uses its own title and primary). Compose Enter does not bubble. Compose paste of text stays in the box; only clipboard files and images become chips. Send queues until the socket is open.

See [docs/README.md](docs/README.md).

## Hooks defined

`onAiProviderRegister`, `onAiComplete`, `onAiToolRegister`, `onAiToolExecute`, `onAiToolData`, `onAiScopeResolve`, `onAiPromptFragment`, `onAiQuotaCheck`, `onAiQuotaSettle`, `onAiTurnBefore`, `onAiTurnAfter`.

## Tests

Unit tests live in `webapp/tests/unit/` and use the framework Jest config (Babel, global setup, `.jpulse/app.json`). This tree has to sit at `plugins/ai-core` inside a jPulse checkout.

From **this directory**:

```bash
npm test
```

Or the same `npx jest plugins/ai-core/webapp/tests/unit plugins/hello-ai/webapp/tests/unit --runInBand` from here or from the **framework repo root**. A bare `npx jest` against these files without that config treats them as CommonJS and fails on `import`.

One file:

```bash
npx jest plugins/ai-core/webapp/tests/unit/turn-loop.test.js --runInBand
```

`--runInBand` matches the framework `test:unit` script. The suite covers the tools layer (plain actor, no Express request), the tools/agent/transport import boundary, the turn loop (multi-call `tool_use`, retry/fatal, cancel, timeout, lease rollback, persist provider/model), SSE streaming (a text delta before the provider hook resolves), quota, `onBehalfOf` logging, the active-thread unique index, MCP-origin filtering, usage upsert, plugin-config `debugDumps`, the `configured` menu filter, vision gating, and attachments (sources, ingest mapping, convert path, Redis mailbox, `data.media`, loop purity).

`ai-mock` has no separate test tree; the loop and SSE tests drive it through `onAiComplete`.

## Plugin releases

- **1.0.12**, W-239, 2026-09-19: `/sources` footer names how many sources are used of the maximum, then the image count. The source cap does not include images. A listed PNG is not missing from the count.
- **1.0.11**, W-238, 2026-09-19: Blocked chip Attach uses `jp-tooltip`, not `title`. Enabling Attach (or a new reason) unbinds that tooltip. A conversation switch confirm says Switch, not New conversation. Compose Enter does not bubble to the host page. The AI WebSocket pattern registers on the host `WebSocketController`, so a `plugins/ai-core` symlink still serves `/api/1/ws/ai/:threadId`.
- **1.0.10**, W-237, 2026-09-19: Chip ⋯ Attach when `adapter.attach` exists. `create()` forwards `mobile`, `defaults`, `minWidth`, and `minHeight`. Compose pads `safe-area-inset-bottom`. `destroy()` cancels a running turn. `/new` and a chip-dropping thread switch confirm. `handle.setTitle`. WebSocket turns carry `session.user`. Send queues until the socket is open; requires jPulse `>=2.0.5`.
- **1.0.9**, W-234, 2026-09-19: Image chips stay on Send, same as text and URL chips. The Redis mailbox peeks and is deleted only on ✕, `/new`, thread switch, or reload.
- **1.0.8**, W-233, 2026-09-19: `create({ title })` sets the toolbar label. `storageKey`, `cascade`, and `group` are forwarded to the float panel. `create()` returns `destroy()` that removes the body node and closes the per-thread WebSocket. Compose paste of text stays in the box; only clipboard files and images become chips. This turn's source/image list is on the user message; earlier filenames are stale. The (+) attach menu flips to stay inside the panel. Enter on rename does not bubble.
- **1.0.7**, W-232, 2026-09-18: Convert and image uploads honor Site Configuration → AI (`maxConvertBytes` default 25 MB under a 25mb route ceiling). `AiCore.deleteByScope` wipes a deleted object's conversations. Site-wide `defaultToolTimeoutMs` (10000). Reserved `list_sources` / `get_source` refused with a warning. `handle.attachments()` replaces `sources` / `images` / `sourceFile`.
- **1.0.6**, W-231, 2026-09-17: Hello AI extracted as a bundled companion plugin. `bundle.members` is `ai-mock` + `hello-ai`. Disable Hello AI to hide the demo without turning off AI.
- **1.0.5**, W-230, 2026-09-17: Site-owned panel regions and slash commands — named anchors, a complete `commands` list, ten gated defaults, clickable `[[label]]` rows, and a context row gated on `adapter.contextOptions()`. `describeScope` removed from the adapter.
- **1.0.4**, W-228, 2026-09-17: Attachments, URL ingest, document conversion path, and vision — tab-local sources, Redis-staged images, `list_sources` / `get_source`, streaming convert and image-stage routes. No converter ships.
- **1.0.3**, W-227, 2026-09-17: Propose and apply — proposal records on the turn, Apply cards, apply/undo endpoints, and a site-configured false-claim guard. `hello-ai` adds `propose_draft_rewrite` beside the direct write.
- **1.0.2**, W-226, 2026-09-17: Chat panel (`jPulse.ai.panel`), client-host tools over a per-thread WebSocket, shared `utils/ai-tools/` modules, and the `/hello-ai/` scratch-pad demo. Requires framework >= 2.0.3.
- **1.0.1**, W-224, 2026-09-17: Model-selection surface — omit a provider with `configured: false`, persist the thread pair, accept `provider`/`model` on `PUT /api/1/ai/thread/:id`, grey non-vision rows when `?hasImages=1`, provider-only site default, and the live capability probe on `/jpulse-plugins/ai-core.shtml`.
- **1.0.0**, W-223, 2026-09-17: First release: tools layer, agent layer, mock-ready provider contract, HTTP/SSE, admin AI tab, usage page.
