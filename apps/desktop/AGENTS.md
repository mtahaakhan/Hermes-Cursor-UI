# Browser UI Engineering Guide

This package is the browser-first Hermes Cursor UI. It is a React application,
not a native desktop shell. Read this with the repository-level `AGENTS.md` and
[`DESIGN.md`](./DESIGN.md).

## Runtime boundaries

Three layers have distinct authority:

- **Hermes backend** owns sessions, tools, models, files, configuration, and
  streaming work.
- **Browser bridge** owns host capability adaptation, authenticated REST calls,
  and the gateway WebSocket URL.
- **React renderer** owns presentation, navigation, and ephemeral interaction
  state.

The renderer must not import Node APIs or assume a native preload. Extend
`src/browser-bridge.ts` when a browser-safe capability is needed, or add an
authenticated backend endpoint when the operation belongs to the Hermes host.
Unavailable capabilities must be checked explicitly and degrade without
crashing recovery surfaces.

## State ownership

- Backend truth is cached in the renderer; reconcile instead of clobbering.
- Shared renderer state belongs in small feature-owned nanostores.
- Query-shaped server state belongs in the query layer.
- Component-local interaction state stays local.
- Persistence keys must declare their scope: global, profile, connection,
  project, or session.

Profile and connection switches are re-homes, not cold boots. Clear all
gateway-bound state before repopulating it, and never let an older async result
overwrite newer intent.

## Browser bridge rules

- Keep one implementation of the browser host contract.
- Route backend requests through the same-origin `/api` proxy.
- Use the active session/profile when an endpoint is scoped.
- Capability checks must guard the method itself (`bridge?.method?.()`), not
  only the bridge object.
- Recovery and error UI must remain functional when logging, filesystem, media,
  notification, or browser APIs are unavailable.
- Do not add a second backend process path; `scripts/dev-browser.mjs` owns local
  development startup.

## UI structure

- Route roots compose; they do not become controllers.
- Features own their atoms and colocated actions.
- Components that render from atoms use `useStore`; non-rendering actions read
  with `$atom.get()`.
- Keep chat, transcript, composer, projects, and supporting panes on their
  existing shared primitives.
- Never navigate or steal focus because background work completed.

## Verification

Run the package's actual browser checks:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

For runtime changes, also cold-start from the repository root with
`npm run dev:browser` and verify the page at `http://127.0.0.1:5174`.
