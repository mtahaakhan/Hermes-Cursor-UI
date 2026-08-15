"""Prepare the production assets used by the Hermes Cursor UI launcher.

This module is the distribution seam for the browser UI.  Callers provide the
repository root and, when a build is needed, an npm executable; the module
hides workspace layout, build invocation, and artifact validation.
"""

from __future__ import annotations

import subprocess
from pathlib import Path


class CursorUiError(RuntimeError):
    """Raised when the Cursor UI cannot be prepared for launch."""


def cursor_ui_dist(project_root: Path) -> Path:
    """Return the compiled Cursor UI directory for ``project_root``."""
    return project_root / "apps" / "desktop" / "dist"


def prepare_cursor_ui(
    project_root: Path,
    *,
    npm: str | None,
    rebuild: bool = False,
) -> Path:
    """Return a usable production build, creating it when necessary.

    An existing build has no Node.js runtime dependency.  A missing build (or
    an explicit rebuild) requires npm and is produced through the repository's
    checked-in workspace script.
    """
    project_root = project_root.resolve()
    package_json = project_root / "apps" / "desktop" / "package.json"
    dist = cursor_ui_dist(project_root)
    index = dist / "index.html"

    if not package_json.is_file():
        raise CursorUiError(f"Cursor UI source not found at: {package_json.parent}")

    if index.is_file() and not rebuild:
        return dist

    if not npm:
        raise CursorUiError(
            "The Cursor UI has not been built and npm is unavailable. "
            "Install with the repository installer, or install Node.js and run "
            "`npm run build --workspace apps/desktop`."
        )

    completed = subprocess.run(
        [npm, "run", "build", "--workspace", "apps/desktop"],
        cwd=project_root,
        check=False,
    )
    if completed.returncode != 0 or not index.is_file():
        raise CursorUiError(
            "Could not build the Cursor UI. Run "
            "`npm run build --workspace apps/desktop` for full output."
        )
    return dist
