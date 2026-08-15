from __future__ import annotations

import subprocess
from pathlib import Path
from unittest.mock import patch

import pytest

from hermes_cli.cursor_ui import CursorUiError, prepare_cursor_ui


def _source_tree(tmp_path: Path) -> Path:
    root = tmp_path / "repo"
    desktop = root / "apps" / "desktop"
    desktop.mkdir(parents=True)
    (desktop / "package.json").write_text("{}", encoding="utf-8")
    return root


def test_existing_production_build_needs_no_node_runtime(tmp_path):
    root = _source_tree(tmp_path)
    dist = root / "apps" / "desktop" / "dist"
    dist.mkdir()
    (dist / "index.html").write_text("ready", encoding="utf-8")

    with patch("hermes_cli.cursor_ui.subprocess.run") as run:
        assert prepare_cursor_ui(root, npm=None) == dist

    run.assert_not_called()


def test_missing_build_is_created_through_workspace_script(tmp_path):
    root = _source_tree(tmp_path)
    dist = root / "apps" / "desktop" / "dist"

    def build(*_args, **_kwargs):
        dist.mkdir()
        (dist / "index.html").write_text("ready", encoding="utf-8")
        return subprocess.CompletedProcess([], 0)

    with patch("hermes_cli.cursor_ui.subprocess.run", side_effect=build) as run:
        assert prepare_cursor_ui(root, npm="npm") == dist

    assert run.call_args.args[0] == [
        "npm",
        "run",
        "build",
        "--workspace",
        "apps/desktop",
    ]


def test_missing_build_explains_node_requirement(tmp_path):
    root = _source_tree(tmp_path)

    with pytest.raises(CursorUiError, match="npm is unavailable"):
        prepare_cursor_ui(root, npm=None)
