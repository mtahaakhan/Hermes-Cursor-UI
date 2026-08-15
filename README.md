# Hermes Cursor UI

An open-source, Cursor-style browser workbench for
[Hermes Agent](https://github.com/NousResearch/hermes-agent).

It provides chat, sessions, projects, files, previews, tools, settings, and an
integrated terminal in a browser-first interface. It uses the same Hermes home,
models, memories, skills, tools, and session database as the Hermes CLI. There
is no Electron runtime and no second private desktop backend.

> Independent community project. Not affiliated with or endorsed by Cursor,
> Anysphere, Nous Research, or the Hermes Agent maintainers. “Cursor” is used
> descriptively; Cursor and its marks belong to their respective owners.

![Hermes Cursor UI](cursor-ui-web-verified.png)

## Install

### Requirements

- A working [Hermes Agent](https://github.com/NousResearch/hermes-agent)
  installation
- Git
- Node.js 22 or newer and npm (installation/build time only)
- macOS, Linux, or Windows

Your existing `~/.hermes` configuration and data are reused. The installer does
not replace the official `hermes` command or modify its checkout.

### macOS and Linux

```bash
curl -fsSL https://raw.githubusercontent.com/mtahaakhan/Hermes-Cursor-UI/main/install.sh | bash
hermes-cursor
```

### Windows PowerShell

```powershell
irm https://raw.githubusercontent.com/mtahaakhan/Hermes-Cursor-UI/main/install.ps1 | iex
hermes-cursor
```

The installer clones this repository to `~/.hermes/cursor-ui`, installs the
browser dependencies, creates a production build, and adds a small
`hermes-cursor` launcher under `~/.local/bin`.

If that directory is not already on `PATH`, add it and restart your terminal.

## Use

```bash
hermes-cursor                          # open the UI
hermes-cursor --cwd /path/to/project   # start in a project
hermes-cursor --port 9130              # use another local port
hermes-cursor --no-open                # start without opening a browser
hermes-cursor --rebuild                # rebuild production assets first
```

On macOS, install an optional Finder/Dock launcher:

```bash
hermes-cursor --install-app
```

The app bundle is only a launcher. It opens the same local browser UI and does
not contain Electron or start a separate hidden Hermes installation.

### What is shared with Hermes?

Hermes Cursor UI reads the same profile-scoped state as the CLI:

- provider and model configuration
- sessions and conversation history
- memories, skills, plugins, and MCP configuration
- tool settings and approvals
- projects and working directories

The browser is another Hermes client. It does not mirror token-by-token output
from an already-running terminal process; start or resume that session from the
browser UI when you want live browser updates.

## Update or uninstall

Run the installer again to fast-forward an existing clean installation:

```bash
curl -fsSL https://raw.githubusercontent.com/mtahaakhan/Hermes-Cursor-UI/main/install.sh | bash
```

To uninstall, remove `~/.hermes/cursor-ui` and the `hermes-cursor` launcher. If
you installed the optional macOS app, move `Hermes.app` to Trash as well. Your
Hermes configuration and sessions remain untouched.

## Manual installation

```bash
git clone https://github.com/mtahaakhan/Hermes-Cursor-UI.git
cd Hermes-Cursor-UI
npm ci
npm run build:cursor
./bin/hermes-cursor
```

Set `HERMES_PYTHON` if Hermes uses a non-standard Python environment:

```bash
HERMES_PYTHON=/path/to/hermes/python ./bin/hermes-cursor
```

## Development

```bash
git clone https://github.com/mtahaakhan/Hermes-Cursor-UI.git
cd Hermes-Cursor-UI
npm ci
npm run dev:browser
```

The development launcher starts a loopback Hermes backend on port `9121`, Vite
on port `5174`, opens the browser, and owns both processes. Production mode
builds the React application once and serves it directly from Hermes with a
fresh session token injected into the page.

Run the focused checks before submitting a change:

```bash
npm run test:cursor
npm run build:cursor
pytest tests/hermes_cli/test_cursor_ui.py tests/hermes_cli/test_gui_command.py
```

See [apps/desktop/README.md](apps/desktop/README.md) for UI architecture and
[CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines.

## Architecture

```text
default browser
  └─ authenticated React workbench
       └─ loopback HTTP + WebSocket
            └─ Hermes gateway/backend
                 ├─ sessions and memory
                 ├─ models and tools
                 ├─ files and terminal
                 └─ ~/.hermes configuration
```

The public launcher is a deep module with one interface: `hermes-cursor`.
Backend discovery, production asset preparation, authentication, browser
opening, and process shutdown remain implementation details behind it.

## Security

The server binds to `127.0.0.1` by default and injects a fresh session token
into the production page. Do not expose it to a network without adding an
appropriate authenticated reverse proxy. See [SECURITY.md](SECURITY.md) for
reporting and trust-model details.

## License and attribution

MIT licensed. This repository is derived from Hermes Agent by Nous Research
and retains its original license and copyright notices. See [LICENSE](LICENSE)
and [NOTICE.md](NOTICE.md).
