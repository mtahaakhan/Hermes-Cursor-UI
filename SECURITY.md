# Security policy

## Reporting

Please report vulnerabilities privately through
[GitHub Security Advisories](https://github.com/mtahaakhan/Hermes-Cursor-UI/security/advisories/new).
Do not open a public issue for an unpatched vulnerability.

Include the affected version or commit, operating system, reproduction steps,
impact, and any suggested mitigation.

If the issue also affects unmodified Hermes Agent, report it to the
[upstream Hermes security process](https://github.com/NousResearch/hermes-agent/security/policy)
as well.

## Supported versions

Security fixes are applied to the latest `main`. This project does not yet
maintain multiple release trains.

## Local trust model

Hermes Cursor UI is a single-user local interface:

- the production server binds to `127.0.0.1` by default;
- each launch uses an ephemeral session token injected into the served page;
- API and WebSocket requests require that token;
- the installer reuses the operator's existing Hermes environment and data;
- the UI has the same effective authority as the Hermes process it controls.

Do not bind the server to a public interface without a properly authenticated
reverse proxy. Hermes tools can execute commands and modify files with the
permissions granted to the configured Hermes backend. Use an isolated terminal
backend or whole-process sandbox for untrusted workloads.

Dependencies are installed from the checked-in lockfile. Review installer and
dependency changes carefully before updating a production installation.
