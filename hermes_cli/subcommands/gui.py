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
        "--host",
        default="127.0.0.1",
        help="Loopback host for the production UI (default: 127.0.0.1)",
    )
    gui_parser.add_argument(
        "--port",
        type=int,
        default=9121,
        help="Port for the production UI (default: 9121)",
    )
    gui_parser.add_argument(
        "--no-open",
        action="store_true",
        help="Start the UI without opening the default browser",
    )
    gui_parser.add_argument(
        "--rebuild",
        action="store_true",
        help="Rebuild production browser assets before launch",
    )
    gui_parser.add_argument(
        "--dev",
        action="store_true",
        help="Run the Vite development server instead of production assets",
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
