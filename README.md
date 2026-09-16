# jPulse Framework / Plugins / AI Core Plugin v1.0.0

Server core of the jPulse AI agent: tool authorization, turns, quota, and HTTP/SSE streaming. Ships as `@jpulse-net/plugin-ai` together with `ai-mock`.

Requires jPulse Framework >= 2.0.2 (plugin translation merge).

## Install

```bash
npx jpulse plugin install @jpulse-net/plugin-ai
```

That one command installs `ai-core` and `ai-mock`. Both have `autoEnable: true`. Set the master switch, roles, and quota on Site Configuration → AI. Usage is Admin → AI usage. Debug dumps are on Admin → Plugins → ai-core (off by default).

`ai-core` is the **primary**. It names `ai-mock` in `bundle.members`. Both share `@jpulse-net/plugin-ai`. The bump-version file list lives only here. The companion has no `webapp/bump-version.conf`, and its `package.json` is a publish guard only — staging strips it from the packaged copy.

This `package.json` is wired for a plain `npm publish`: `"files": ["plugins"]` plus `prepack`/`postpack` scripts that stage and unstage the bundle members.

## Bump and publish

From this directory only:

```bash
cd plugins/ai-core
node ../../bin/bump-version.js 1.0.1
npx jpulse plugin publish ai-core --dry-run
npx jpulse plugin publish ai-core --pack-to ./tmp/plugin-ai
```

A bump or publish run from `plugins/ai-mock/` is refused and names `ai-core`.

Plain `npm pack` from this directory (same shape as `npm publish`):

```bash
cd plugins/ai-core
npm pack
tar -tzf jpulse-net-plugin-ai-1.0.0.tgz
rm jpulse-net-plugin-ai-1.0.0.tgz
```

The listing must show `package/package.json`, `package/plugins/ai-core/`, and `package/plugins/ai-mock/`, with no `package/plugin.json` and no `package/plugins/ai-mock/package.json`. Afterwards this directory must have no `plugins/` subdirectory.

## What a site writes

One controller and one line in the view (the panel arrives in a later item). Until then, `POST /api/1/ai/thread/:id/turn` runs a complete turn over SSE against `ai-mock`. Stop an in-flight turn with `POST /api/1/ai/thread/:id/cancel` — do not rely on closing the SSE connection.

See [docs/README.md](docs/README.md).

## Hooks defined

`onAiProviderRegister`, `onAiComplete`, `onAiToolRegister`, `onAiToolExecute`, `onAiToolData`, `onAiScopeResolve`, `onAiPromptFragment`, `onAiQuotaCheck`, `onAiQuotaSettle`, `onAiTurnBefore`, `onAiTurnAfter`.

## Tests

Unit tests live in `webapp/tests/unit/` and use the framework Jest config. Run them from the **framework repo root** (the parent of `plugins/ai-core` when this tree is checked out there):

```bash
npx jest plugins/ai-core/webapp/tests/unit --runInBand
```

One file:

```bash
npx jest plugins/ai-core/webapp/tests/unit/turn-loop.test.js --runInBand
```

`--runInBand` matches the framework `test:unit` script. The suite covers the tools layer (plain actor, no Express request), the tools/agent/transport import boundary, the turn loop (multi-call `tool_use`, retry/fatal, cancel, timeout, lease rollback), SSE streaming (a text delta before the provider hook resolves), quota, `onBehalfOf` logging, the active-thread unique index, MCP-origin filtering, usage upsert, and plugin-config `debugDumps`.

`ai-mock` has no separate test tree; the loop and SSE tests drive it through `onAiComplete`.

## 1.0.0

First release: tools layer, agent layer, mock-ready provider contract, HTTP/SSE, admin AI tab, usage page.
