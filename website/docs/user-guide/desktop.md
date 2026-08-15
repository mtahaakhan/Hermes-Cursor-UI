---
sidebar_position: 4
title: Browser UI
description: Launch the Cursor-style Hermes interface in your browser.
---

# Hermes Browser UI

Hermes ships a Cursor-style browser interface for chat, sessions, files,
previews, tools, and an integrated terminal. It uses the same Hermes agent and
gateway as the CLI; there is no Electron application runtime to install or
update. The optional macOS app icon is only a launcher for the browser command.

## Launch

From the repository root, run:

```bash
npm run dev:browser
```

The launcher starts a local Hermes backend on `127.0.0.1:9121`, starts the UI
on `127.0.0.1:5174`, waits for both services, and opens the UI in your default
browser. Press `Ctrl+C` in the launching terminal to stop services it started.

The equivalent Hermes command is:

```bash
hermes desktop
```

`hermes gui` remains an alias. To start in a particular project:

```bash
hermes desktop --cwd /path/to/project
```

### macOS app icon

Install a lightweight Finder/Dock launcher once:

```bash
hermes desktop --install-app
```

Opening `Hermes.app` after that runs the same browser launcher. It does not
contain Electron and does not create a second private Hermes backend. An older
app bundle is moved to Trash before replacement, so the migration is
recoverable.

## Development

Run only the Vite renderer when a compatible backend is already listening on
port `9121`:

```bash
npm run dev:renderer --workspace apps/desktop
```

Useful checks:

```bash
npm run typecheck --workspace apps/desktop
npm run test --workspace apps/desktop
npm run build --workspace apps/desktop
```

The browser capability adapter is `apps/desktop/src/browser-bridge.ts`. It
routes JSON-RPC, REST, filesystem, logs, and terminal traffic through the local
backend and exposes browser-safe replacements for host features.

## Troubleshooting

- If port `9121` or `5174` is occupied by an unrelated process, stop that
  process and launch again.
- If Hermes cannot find Python, activate the repository `.venv` or install
  Hermes so `~/.hermes/hermes-agent/venv` exists.
- If the page was already open, reload once after restarting the launcher.
- Backend logs are available through the UI or with `hermes logs`.
