# Hermes Cursor UI

Browser-first React interface for Hermes Agent. It keeps the full Hermes agent,
sessions, tools, projects, and settings behind a Cursor-style workbench without
shipping a native Electron shell.

## Run

From the repository root:

```bash
npm run dev:browser
```

On macOS, install a Finder/Dock launcher once with:

```bash
hermes desktop --install-app
```

`Hermes.app` is a lightweight launcher for the same browser command; it does
not contain Electron or start a second private backend. If an older Hermes app
exists, it is preserved in Trash before the launcher is installed.

The launcher:

- finds a Hermes Python environment;
- starts `hermes serve` on `127.0.0.1:9121` with a local session token;
- starts Vite on `127.0.0.1:5174`;
- opens the UI in the default browser; and
- stops both owned processes together when you press `Ctrl+C`.

If either service is already healthy, the launcher reuses it.

## Architecture

- `src/` owns the React application, routes, state, transcript, composer, and
  supporting workbench panels.
- `src/browser-bridge.ts` supplies browser-safe host capabilities and routes
  REST/WebSocket traffic through Vite's same-origin `/api` proxy.
- `apps/shared/` owns the framework-independent JSON-RPC/WebSocket transport.
- `hermes serve` owns sessions, model calls, tools, files, and other backend
  truth.

The browser never imports Node APIs. Host-specific behavior belongs in the
browser bridge or the backend, and unavailable native capabilities must degrade
without taking down the interface.

## Commands

```bash
npm run dev          # backend + Vite + browser
npm run dev:renderer # Vite only; expects a backend on port 9121
npm run build        # production browser assets
npm run typecheck
npm run lint
npm run test
npm run check
```

## Verification

For changes to this package, run:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

Visual and interaction conventions live in [`DESIGN.md`](./DESIGN.md).
Engineering rules live in [`AGENTS.md`](./AGENTS.md).
