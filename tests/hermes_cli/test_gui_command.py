"""Tests for the browser-first ``hermes desktop`` launcher."""

from __future__ import annotations

import argparse
import subprocess
from pathlib import Path
from unittest.mock import patch

import pytest

from hermes_cli import main as cli_main


def _make_browser_ui_tree(tmp_path: Path) -> Path:
    root = tmp_path / "hermes-agent"
    desktop_dir = root / "apps" / "desktop"
    desktop_dir.mkdir(parents=True)
    (desktop_dir / "package.json").write_text("{}", encoding="utf-8")
    return root


def test_desktop_command_launches_browser_ui(tmp_path, monkeypatch):
    root = _make_browser_ui_tree(tmp_path)
    monkeypatch.setattr(cli_main, "PROJECT_ROOT", root)
    completed = subprocess.CompletedProcess(["npm", "run", "dev:browser"], 0)

    with (
        patch("hermes_cli.main._resolve_node_runtime_npm", return_value="/usr/bin/npm"),
        patch("hermes_cli.main.subprocess.run", return_value=completed) as run,
        pytest.raises(SystemExit) as exc,
    ):
        cli_main.cmd_gui(argparse.Namespace(cwd=None))

    assert exc.value.code == 0
    run.assert_called_once()
    assert run.call_args.args[0] == ["/usr/bin/npm", "run", "dev:browser"]
    assert run.call_args.kwargs["cwd"] == root


def test_desktop_command_forwards_requested_cwd(tmp_path, monkeypatch):
    root = _make_browser_ui_tree(tmp_path)
    project = tmp_path / "project"
    project.mkdir()
    monkeypatch.setattr(cli_main, "PROJECT_ROOT", root)

    with (
        patch("hermes_cli.main._resolve_node_runtime_npm", return_value="npm"),
        patch(
            "hermes_cli.main.subprocess.run",
            return_value=subprocess.CompletedProcess([], 0),
        ) as run,
        pytest.raises(SystemExit),
    ):
        cli_main.cmd_gui(argparse.Namespace(cwd=str(project)))

    env = run.call_args.kwargs["env"]
    assert env["HERMES_DESKTOP_CWD"] == str(project)
    assert env["TERMINAL_CWD"] == str(project)


def test_desktop_command_can_install_browser_app_before_launch(tmp_path, monkeypatch):
    root = _make_browser_ui_tree(tmp_path)
    monkeypatch.setattr(cli_main, "PROJECT_ROOT", root)

    with (
        patch("hermes_cli.main._resolve_node_runtime_npm", return_value="npm"),
        patch("hermes_cli.browser_app.install_default_macos_browser_app") as install_app,
        patch(
            "hermes_cli.main.subprocess.run",
            return_value=subprocess.CompletedProcess([], 0),
        ),
        pytest.raises(SystemExit),
    ):
        cli_main.cmd_gui(argparse.Namespace(cwd=None, install_app=True))

    install_app.assert_called_once_with(project_root=root)
