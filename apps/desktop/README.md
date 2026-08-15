# Hermes Cursor UI

Browser-first React interface for Hermes Agent. It keeps sessions, tools,
projects, files, settings, and the terminal behind a Cursor-style workbench
without shipping a native Electron shell.

## Public installation

With Hermes Agent already installed:

```bash
curl -fsSL https://raw.githubusercontent.com/mtahaakhan/Hermes-Cursor-UI/main/install.sh | bash
hermes-cursor
```

Production mode serves the compiled React application directly from the
authenticated loopback Hermes server. It does not run Vite and does not need
Node.js after the installer has built the assets.

On macOS, install a Finder/Dock launcher with:

```bash
hermes-cursor --install-app
```

`Hermes.app` is a lightweight launcher for the same browser command. It does
not contain Electron or start a second private backend.

## Development

From the repository root:

```bash
npm run dev:browser
```

The development launcher starts a loopback Hermes backend on `9121`, Vite on
`5174`, opens the browser, and owns their shared lifecycle.

Build and run production mode from a checkout:

```bash
npm run build --workspace apps/desktop
./bin/hermes-cursor
```

## Architecture

- `src/` owns the React application, routes, state, transcript, composer, and
  supporting workbench panels.
- `src/browser-bridge.ts` owns browser-safe capabilities and authenticated
  REST/WebSocket transport.
- `apps/shared/` owns the framework-independent JSON-RPC/WebSocket transport.
- The Hermes backend owns sessions, model calls, tools, files, and terminal
  truth.
- `hermes_cli/cursor_ui.py` owns production asset preparation.
- `bin/hermes-cursor` is the public launcher interface.

The browser never imports Node APIs. Host-specific behavior belongs in the
browser bridge or backend. Unavailable native capabilities must degrade without
taking down the interface.

## Commands

```bash
npm run dev          # development backend + Vite + browser
npm run dev:renderer # Vite only; expects a backend on port 9121
npm run build        # production browser assets
npm run typecheck
npm run lint
npm run test
npm run check
```

Visual conventions live in [`DESIGN.md`](./DESIGN.md). Engineering rules live
in [`AGENTS.md`](./AGENTS.md).
