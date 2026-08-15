"""``hermes desktop`` browser-UI launcher parser."""

from __future__ import annotations

from typing import Callable


def build_gui_parser(subparsers, *, cmd_gui: Callable) -> None:
    """Attach the ``gui`` subcommand to ``subparsers``."""
    # =========================================================================
    gui_parser = subparsers.add_parser(
        "desktop",
        aliases=["gui"],
        help="Open the Hermes Cursor UI in your browser",
        description=(
            "Start the Hermes backend and Cursor-style browser interface, then "
            "open it in the default browser. Press Ctrl+C to stop both services."
        ),
    )
    gui_parser.add_argument(
        "--cwd",
        help="Initial project directory for browser chat sessions",
    )
    gui_parser.add_argument(
        "--install-app",
        action="store_true",
        help=(
            "macOS: install a lightweight Hermes.app that opens this browser UI; "
            "the previous app bundle is preserved in Trash"
        ),
    )
    gui_parser.set_defaults(func=cmd_gui)
