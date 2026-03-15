# Effect Electron Architecture

This branch adds a parallel Effect-TS integration path without breaking the current imperative Electron app. The typed Effect slice is live for new IPC channels and preload exposure, while the existing `window.arkwatch` API continues to serve the current renderer.

## Design goals

- Shared schemas are the single source of truth for domain payloads and IPC envelopes.
- Validation happens at the process boundary, not deep in handlers.
- Electron primitives are wrapped behind `Context.Tag` services and `Layer`s.
- Renderer code consumes `Effect` values instead of raw `Promise`s.
- Expected failures stay in the typed error channel across IPC.

## Added structure

```text
src/
  shared/effect/
    bridge.ts
    ipc.ts
    contracts/
      preferences.ts
      system-dialog.ts
  main/effect/
    services.ts
    register-effect-ipc.ts
    lifecycle.ts
    program.ts
  preload/
    effect-bridge.ts
  renderer/src/effect/
    client.ts
    runtime.ts
    hooks.ts
    api.ts
    example.tsx
```

## What is live on this branch

- `src/main/index.ts` now registers Effect-backed IPC handlers in parallel with the legacy handlers.
- `src/preload/index.ts` now exposes `window.effectBridge`.
- `src/renderer/src/types/global.d.ts` types the bridge in the renderer.
- `src/shared/effect/contracts/preferences.ts` and `src/shared/effect/contracts/system-dialog.ts` are end-to-end examples.

## Shared domain pattern

Use `src/shared/effect/contracts/*` as the boundary package:

- Put schemas and schema-derived types together.
- Export domain-specific typed errors as `Schema.TaggedError` classes.
- Export IPC contracts next to the domain schema so the channel, request, success payload, and typed error union stay co-located.

Example:

- `preferencesContracts.get`
- `preferencesContracts.update`
- `systemDialogContracts.pickDirectory`

## Type-safe IPC pattern

`src/shared/effect/ipc.ts` defines the protocol:

- `defineIpcContract(...)` builds a contract from request, success, and domain error schemas.
- `IpcDecodeError` and `IpcUnexpectedError` are the protocol-level failures the main process can serialize back to the renderer.
- `IpcTransportError` represents local renderer-side failures before a response exists.

Main side:

- `src/main/effect/register-effect-ipc.ts` decodes the request with the contract schema.
- The business handler runs as an `Effect` and returns typed domain errors.
- The final envelope is schema-encoded before it crosses the Electron boundary.

Renderer side:

- `src/renderer/src/effect/client.ts` encodes the request, invokes `window.effectBridge`, decodes the typed envelope, and fails with the typed error union.

## Main-process lifecycle scaffold

`src/main/effect/program.ts` is the migration target for a full Effect main process.

- It uses `NodeRuntime.runMain(...)`.
- `src/main/effect/lifecycle.ts` converts Electron app events into an Effect `Stream`.
- `makeBrowserWindowLayer(...)` in `src/main/effect/services.ts` shows a scoped native layer whose release closes the window when the scope ends.

This file is intentionally not wired as the entrypoint yet. The branch keeps the current production bootstrap stable while giving you a clean migration target.

## Native module DI pattern

Two native wrappers are included:

- `ElectronDialogService`: wraps `dialog.showOpenDialog` behind a service and returns typed failures.
- `BrowserWindowController`: wraps `BrowserWindow` in a scoped layer, which is the better fit when you want resource-safe acquisition and release.

Recommended rule:

- Use `Layer.succeed` or `Layer.effect` for stable singleton Electron facilities.
- Use `Layer.scoped` for owned resources like windows, file watchers, child processes, or sockets.

## Renderer pattern

`src/renderer/src/effect/hooks.ts` provides two consumption styles:

- `useEffectQuery(() => effect, deps)` for read paths.
- `useEffectCommand((...args) => effect)` for user-triggered commands.

`src/renderer/src/effect/api.ts` is the renderer-facing API surface. Keep components unaware of channel names and contract schemas.

## Recommended migration order

1. Add new domains under `src/shared/effect/contracts`.
2. Wrap the corresponding main dependencies as services in `src/main/effect/services.ts`.
3. Register a new typed IPC contract in `src/main/effect/register-effect-ipc.ts`.
4. Add a renderer-facing function in `src/renderer/src/effect/api.ts`.
5. Replace raw `window.arkwatch.*` calls in React with `useEffectQuery` or `useEffectCommand` one feature at a time.
6. When enough imperative bootstrap has been moved, swap the main entrypoint to `runEffectMain()` from `src/main/effect/program.ts`.

## Branch notes

- Branch: `feature/effect-electron-scaffold`
- Validation completed: `bun run typecheck`
- Added tests cover the shared IPC schema envelope behavior in `tests/effect-ipc.test.ts`
