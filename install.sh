#!/bin/sh
set -eu

repo_url=${HERMES_CURSOR_REPO:-https://github.com/mtahaakhan/Hermes-Cursor-UI.git}
ref=${HERMES_CURSOR_REF:-main}
install_dir=${HERMES_CURSOR_HOME:-${HERMES_HOME:-$HOME/.hermes}/cursor-ui}
bin_dir=${HERMES_CURSOR_BIN_DIR:-$HOME/.local/bin}

say() { printf '%s\n' "$*"; }
fail() { say "Error: $*" >&2; exit 1; }

command -v git >/dev/null 2>&1 || fail "git is required."
command -v npm >/dev/null 2>&1 || fail "Node.js/npm is required for installation."

if [ -e "$install_dir" ]; then
  [ -d "$install_dir/.git" ] || fail "$install_dir exists but is not a git checkout."
  origin_url=$(git -C "$install_dir" remote get-url origin)
  [ "$origin_url" = "$repo_url" ] || \
    fail "$install_dir uses origin '$origin_url', expected '$repo_url'."
  [ -z "$(git -C "$install_dir" status --porcelain)" ] || \
    fail "$install_dir has local changes; commit or remove them before updating."
  current_branch=$(git -C "$install_dir" branch --show-current)
  [ "$current_branch" = "$ref" ] || \
    fail "$install_dir is on '$current_branch', expected '$ref'."
  say "Updating Hermes Cursor UI..."
  git -C "$install_dir" pull --ff-only origin "$ref"
else
  say "Installing Hermes Cursor UI into $install_dir..."
  mkdir -p "$(dirname "$install_dir")"
  git clone --depth 1 --branch "$ref" "$repo_url" "$install_dir"
fi

say "Installing browser dependencies..."
(cd "$install_dir" && npm ci)

say "Building production browser assets..."
(cd "$install_dir" && npm run build --workspace apps/desktop)

mkdir -p "$bin_dir"
ln -sfn "$install_dir/bin/hermes-cursor" "$bin_dir/hermes-cursor"

if ! "$bin_dir/hermes-cursor" --help >/dev/null 2>&1; then
  fail "Hermes was not found. Install Hermes, then rerun this installer."
fi

say ""
say "Hermes Cursor UI is installed."
say "Run: hermes-cursor"
case ":$PATH:" in
  *":$bin_dir:"*) ;;
  *) say "Add $bin_dir to PATH if the command is not found." ;;
esac
if [ "$(uname -s 2>/dev/null || true)" = "Darwin" ]; then
  say "Optional macOS app icon: hermes-cursor --install-app"
fi
