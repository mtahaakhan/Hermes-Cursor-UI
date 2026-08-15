"""Install a tiny macOS app bundle that opens the browser-first Hermes UI.

The bundle is intentionally just a launcher script. It contains no renderer,
backend, Electron runtime, or update machinery; all product behavior remains in
``hermes desktop`` so the app icon and the CLI use the same process topology.
"""

from __future__ import annotations

import os
import plistlib
import shlex
import shutil
import stat
import subprocess
import sys
import tempfile
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path


@dataclass(frozen=True)
class BrowserAppInstallResult:
    app_path: Path
    replaced_app_path: Path | None


def _default_app_path() -> Path:
    system_app = Path("/Applications/Hermes.app")
    if system_app.exists() and os.access(system_app, os.W_OK):
        return system_app
    return Path.home() / "Applications" / "Hermes.app"


def _available_backup_path(backup_root: Path) -> Path:
    stamp = datetime.now().strftime("%Y-%m-%d %H%M%S")
    candidate = backup_root / f"Hermes (before browser launcher {stamp}).app"
    suffix = 2
    while candidate.exists():
        candidate = backup_root / f"Hermes (before browser launcher {stamp}) {suffix}.app"
        suffix += 1
    return candidate


def _launcher_script(project_root: Path, python_executable: Path) -> str:
    root = shlex.quote(str(project_root.resolve()))
    # Keep the venv entrypoint itself. ``Path.resolve()`` follows its symlink to
    # the bare system interpreter, which drops the venv's site-packages when a
    # Finder-launched app starts Hermes (the first live launcher regression).
    python = shlex.quote(os.path.abspath(os.path.expanduser(str(python_executable))))
    return f"""#!/bin/zsh
set -u

project_root={root}
python_executable={python}
log_root="${{HERMES_HOME:-$HOME/.hermes}}/logs"
mkdir -p "$log_root"

if [[ ! -x "$python_executable" ]]; then
  print -r -- "Hermes Python is missing: $python_executable" >> "$log_root/browser-launcher.log"
  exit 1
fi

cd "$project_root" || exit 1
nohup "$python_executable" -m hermes_cli.main desktop \
  >> "$log_root/browser-launcher.log" 2>&1 </dev/null &
exit 0
"""


def _generate_icns(source: Path, destination: Path) -> bool:
    """Generate an app icon with macOS tools; fail softly on non-mac test hosts."""
    sips = shutil.which("sips")
    iconutil = shutil.which("iconutil")
    if not source.is_file() or not sips or not iconutil:
        return False

    with tempfile.TemporaryDirectory(prefix="hermes-icon-") as raw_tmp:
        iconset = Path(raw_tmp) / "Hermes.iconset"
        iconset.mkdir()
        for points in (16, 32, 128, 256, 512):
            for scale in (1, 2):
                pixels = points * scale
                suffix = "@2x" if scale == 2 else ""
                output = iconset / f"icon_{points}x{points}{suffix}.png"
                completed = subprocess.run(
                    [sips, "-z", str(pixels), str(pixels), str(source), "--out", str(output)],
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                    check=False,
                )
                if completed.returncode != 0:
                    return False
        completed = subprocess.run(
            [iconutil, "-c", "icns", str(iconset), "-o", str(destination)],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            check=False,
        )
        return completed.returncode == 0 and destination.is_file()


def install_macos_browser_app(
    *,
    app_path: Path,
    project_root: Path,
    python_executable: Path,
    icon_source: Path | None,
    backup_root: Path | None = None,
) -> BrowserAppInstallResult:
    """Atomically install the browser launcher and preserve any prior bundle."""
    app_path = app_path.expanduser().resolve()
    project_root = project_root.expanduser().resolve()
    python_executable = Path(
        os.path.abspath(os.path.expanduser(str(python_executable)))
    )
    app_path.parent.mkdir(parents=True, exist_ok=True)

    stage_parent = Path(tempfile.mkdtemp(prefix=".hermes-browser-app-", dir=app_path.parent))
    staged_app = stage_parent / "Hermes.app"
    contents = staged_app / "Contents"
    macos = contents / "MacOS"
    resources = contents / "Resources"
    macos.mkdir(parents=True)
    resources.mkdir()

    executable = macos / "Hermes"
    executable.write_text(_launcher_script(project_root, python_executable), encoding="utf-8")
    executable.chmod(executable.stat().st_mode | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH)

    icon_written = bool(icon_source) and _generate_icns(
        Path(icon_source).expanduser().resolve(), resources / "Hermes.icns"
    )
    info = {
        "CFBundleDisplayName": "Hermes",
        "CFBundleExecutable": "Hermes",
        "CFBundleIdentifier": "com.nousresearch.hermes",
        "CFBundleInfoDictionaryVersion": "6.0",
        "CFBundleName": "Hermes",
        "CFBundlePackageType": "APPL",
        "CFBundleShortVersionString": "1.0",
        "CFBundleVersion": "1",
        "LSApplicationCategoryType": "public.app-category.developer-tools",
        "LSMinimumSystemVersion": "12.0",
        "LSUIElement": True,
        "NSHighResolutionCapable": True,
    }
    if icon_written:
        info["CFBundleIconFile"] = "Hermes.icns"
    with (contents / "Info.plist").open("wb") as handle:
        plistlib.dump(info, handle, sort_keys=True)

    replaced: Path | None = None
    try:
        if app_path.exists():
            backup_root = (backup_root or (Path.home() / ".Trash")).expanduser().resolve()
            backup_root.mkdir(parents=True, exist_ok=True)
            replaced = _available_backup_path(backup_root)
            shutil.move(str(app_path), str(replaced))
        shutil.move(str(staged_app), str(app_path))
    except Exception:
        if replaced is not None and replaced.exists() and not app_path.exists():
            shutil.move(str(replaced), str(app_path))
        raise
    finally:
        shutil.rmtree(stage_parent, ignore_errors=True)

    return BrowserAppInstallResult(app_path=app_path, replaced_app_path=replaced)


def install_default_macos_browser_app(*, project_root: Path) -> BrowserAppInstallResult:
    if sys.platform != "darwin":
        raise RuntimeError("The Hermes app launcher can only be installed on macOS.")
    icon = project_root / "apps" / "desktop" / "public" / "apple-touch-icon.png"
    return install_macos_browser_app(
        app_path=_default_app_path(),
        project_root=project_root,
        python_executable=Path(sys.executable),
        icon_source=icon,
    )
