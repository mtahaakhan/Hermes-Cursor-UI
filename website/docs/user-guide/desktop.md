---
sidebar_position: 4
title: Browser UI
description: Install and launch the Cursor-style Hermes interface.
---

# Hermes Cursor UI

Hermes Cursor UI is an independent open-source browser workbench for chat,
sessions, files, previews, tools, and an integrated terminal. It uses the same
Hermes configuration and data as the CLI without an Electron runtime.

## Install

Install Hermes Agent first, then run:

```bash
curl -fsSL https://raw.githubusercontent.com/mtahaakhan/Hermes-Cursor-UI/main/install.sh | bash
hermes-cursor
```

On Windows PowerShell:

```powershell
irm https://raw.githubusercontent.com/mtahaakhan/Hermes-Cursor-UI/main/install.ps1 | iex
hermes-cursor
```

The installer places the UI in `~/.hermes/cursor-ui`, builds production assets,
and adds the independent `hermes-cursor` command. It does not replace the
official `hermes` command.

## Launch options

```bash
hermes-cursor --cwd /path/to/project
hermes-cursor --port 9130
hermes-cursor --no-open
hermes-cursor --rebuild
```

### macOS app icon

```bash
hermes-cursor --install-app
```

The resulting `Hermes.app` is only a launcher for the local browser UI. It does
not contain Electron or create another Hermes installation.

## Development

```bash
git clone https://github.com/mtahaakhan/Hermes-Cursor-UI.git
cd Hermes-Cursor-UI
npm ci
npm run dev:browser
```

The development launcher uses ports `9121` and `5174`. Production serves the
compiled UI directly from the authenticated loopback Hermes server.

Useful checks:

```bash
npm run typecheck --workspace apps/desktop
npm run test --workspace apps/desktop
npm run build --workspace apps/desktop
```

## Troubleshooting

- If the selected port is occupied, stop that process or pass another `--port`.
- If Hermes Python cannot be found, set `HERMES_PYTHON` to the interpreter used
  by Hermes.
- If the command is missing, add `~/.local/bin` to `PATH`.
- Backend logs remain available with `hermes logs`.
