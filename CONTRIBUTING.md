# Contributing

Thanks for helping improve Hermes Cursor UI.

## Scope

This repository maintains the browser-first Cursor-style interface, its
launcher/install experience, and the Hermes integration needed by that
surface. General Hermes Agent fixes should normally be proposed upstream at
[NousResearch/hermes-agent](https://github.com/NousResearch/hermes-agent).

Before opening an issue, confirm whether the problem reproduces in:

- `hermes-cursor` only — report it here;
- both Hermes CLI and Hermes Cursor UI — report it upstream unless the failure
  is in this repository's integration changes.

## Development setup

Install Hermes Agent first, then:

```bash
git clone https://github.com/mtahaakhan/Hermes-Cursor-UI.git
cd Hermes-Cursor-UI
npm ci
npm run dev:browser
```

For Python integration work, use Python 3.11–3.13 and install this checkout in
a dedicated environment:

```bash
uv venv .venv --python 3.12
uv sync --extra dev
```

## Checks

Run the checks relevant to your change:

```bash
npm run test:cursor
npm run build:cursor
pytest tests/hermes_cli/test_cursor_ui.py tests/hermes_cli/test_gui_command.py
```

For changes outside the browser UI, follow the repository-level guidance in
[AGENTS.md](AGENTS.md) and run the corresponding Hermes test suite.

## Pull requests

- Keep changes focused and explain the user-visible behavior.
- Add behavior tests for fixes and new launcher functionality.
- Preserve loopback binding and authenticated browser/backend communication.
- Do not introduce Electron, a second chat implementation, or a second Hermes
  backend lifecycle.
- Keep upstream attribution intact.
- Include screenshots for visible interface changes.

By submitting a contribution, you agree that it may be distributed under this
repository's MIT license.
