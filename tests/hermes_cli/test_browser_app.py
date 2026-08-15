"""Behavior contract for the browser-only macOS Hermes launcher."""

from __future__ import annotations

import plistlib
from pathlib import Path

from hermes_cli.browser_app import install_macos_browser_app


def test_macos_launcher_opens_browser_ui_without_spawning_a_backend_directly(tmp_path):
    app = tmp_path / "Applications" / "Hermes.app"
    project_root = tmp_path / "HermesCursorUI"
    project_root.mkdir()
    python = tmp_path / "venv" / "bin" / "python"

    result = install_macos_browser_app(
        app_path=app,
        project_root=project_root,
        python_executable=python,
        icon_source=None,
    )

    executable = app / "Contents" / "MacOS" / "Hermes"
    script = executable.read_text(encoding="utf-8")
    plist = plistlib.loads((app / "Contents" / "Info.plist").read_bytes())

    assert result.app_path == app
    assert result.replaced_app_path is None
    assert executable.stat().st_mode & 0o111
    assert str(project_root) in script
    assert str(python) in script
    assert "-m hermes_cli.main desktop" in script
    assert "hermes_cli.main serve" not in script
    assert "electron" not in script.lower()
    assert plist["CFBundleExecutable"] == "Hermes"
    assert plist["CFBundleIdentifier"] == "com.nousresearch.hermes"


def test_macos_launcher_preserves_the_replaced_app(tmp_path):
    app = tmp_path / "Applications" / "Hermes.app"
    old_executable = app / "Contents" / "MacOS" / "Hermes"
    old_executable.parent.mkdir(parents=True)
    old_executable.write_text("legacy-electron", encoding="utf-8")
    backup_root = tmp_path / "Trash"

    result = install_macos_browser_app(
        app_path=app,
        project_root=tmp_path / "repo",
        python_executable=tmp_path / "python",
        icon_source=None,
        backup_root=backup_root,
    )

    assert result.replaced_app_path is not None
    assert result.replaced_app_path.parent == backup_root
    assert (result.replaced_app_path / "Contents" / "MacOS" / "Hermes").read_text(
        encoding="utf-8"
    ) == "legacy-electron"
    assert "hermes_cli.main desktop" in (
        app / "Contents" / "MacOS" / "Hermes"
    ).read_text(encoding="utf-8")


def test_macos_launcher_preserves_virtualenv_python_symlink(tmp_path):
    base_python = tmp_path / "python3.13"
    base_python.write_text("base", encoding="utf-8")
    venv_python = tmp_path / "venv" / "bin" / "python"
    venv_python.parent.mkdir(parents=True)
    venv_python.symlink_to(base_python)
    app = tmp_path / "Applications" / "Hermes.app"

    install_macos_browser_app(
        app_path=app,
        project_root=tmp_path / "repo",
        python_executable=venv_python,
        icon_source=None,
    )

    script = (app / "Contents" / "MacOS" / "Hermes").read_text(encoding="utf-8")
    assert str(venv_python) in script
    assert f"python_executable={base_python}" not in script
