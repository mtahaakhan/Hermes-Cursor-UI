---
sidebar_position: 5
title: "TUI & Browser UI from Worktrees"
description: "Run the Ink TUI and Cursor-style browser UI from a git worktree while sharing dependencies"
---

# TUI & Browser UI from Worktrees

The Python core runs from any Hermes git worktree. The TypeScript surfaces
(`ui-tui/` and `apps/desktop/`) also need the root `node_modules` tree. To avoid
installing the same dependencies in every worktree, link a compatible install
from your main checkout:

```bash
export HERMES_MAIN_CHECKOUT="$HOME/src/Hermes-Agent"
ln -s "$HERMES_MAIN_CHECKOUT/node_modules" ./node_modules
```

Only share dependencies when both worktrees have the same `package-lock.json`.
If the lockfiles differ, run `npm ci` in the worktree instead.

## TUI

```bash
PYTHONPATH="$PWD" "$HERMES_MAIN_CHECKOUT/.venv/bin/python" \
  -m hermes_cli.main --tui --dev
```

## Browser UI

The browser launcher resolves the current repository, starts the backend and
Vite, then opens the interface:

```bash
npm run dev:browser
```

To launch through the CLI with the worktree selected as the initial project:

```bash
PYTHONPATH="$PWD" "$HERMES_MAIN_CHECKOUT/.venv/bin/python" \
  -m hermes_cli.main desktop --cwd "$PWD"
```

The browser UI uses ports `9121` (backend) and `5174` (Vite). If either port is
occupied by an unrelated process, stop it before launching another worktree.

See [Browser UI](../user-guide/desktop.md) for the full command and validation
reference.
