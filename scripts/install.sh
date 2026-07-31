#!/usr/bin/env bash
#
# Voicing — one-line installer for macOS / Linux.
# Downloads the latest .vsix from GitHub Releases and installs it into every
# detected VS Code-family editor (VS Code, Cursor, Windsurf, VSCodium, ...).
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/ainure-git/voicing/main/scripts/install.sh | bash
#
set -euo pipefail

REPO="ainure-git/voicing"
API="https://api.github.com/repos/${REPO}/releases/latest"

say() { printf '\033[36m%s\033[0m\n' "$*"; }
err() { printf '\033[31m%s\033[0m\n' "$*" >&2; }

command -v curl >/dev/null 2>&1 || { err "curl is required."; exit 1; }

say "==> Finding the latest Voicing release..."
ASSET_URL="$(curl -fsSL "$API" \
  | grep -oE '"browser_download_url"[[:space:]]*:[[:space:]]*"[^"]+\.vsix"' \
  | head -n1 | sed -E 's/.*"(https[^"]+)".*/\1/')"

if [ -z "${ASSET_URL:-}" ]; then
  err "Could not find a .vsix asset in the latest release."
  err "Check: https://github.com/${REPO}/releases"
  exit 1
fi

TMPDIR="$(mktemp -d)"
trap 'rm -rf "$TMPDIR"' EXIT
VSIX="${TMPDIR}/voicing.vsix"

say "==> Downloading ${ASSET_URL##*/} ..."
curl -fsSL "$ASSET_URL" -o "$VSIX"

INSTALLED=0
for cli in code code-insiders cursor windsurf codium vscodium; do
  if command -v "$cli" >/dev/null 2>&1; then
    say "==> Installing into '${cli}' ..."
    if "$cli" --install-extension "$VSIX" >/dev/null 2>&1; then
      INSTALLED=$((INSTALLED + 1))
      printf '    \033[32mOK\033[0m\n'
    else
      err "    Failed to install into ${cli} (continuing)."
    fi
  fi
done

if [ "$INSTALLED" -eq 0 ]; then
  err "No supported editor CLI found (code / cursor / windsurf / codium)."
  err "Install one, enable its shell command, or install the .vsix manually:"
  err "  https://github.com/${REPO}/releases/latest"
  exit 1
fi

say "==> Done. Installed into ${INSTALLED} editor(s). Reload the window to activate."
if command -v spd-say >/dev/null 2>&1 || command -v espeak-ng >/dev/null 2>&1 || command -v say >/dev/null 2>&1; then
  :
else
  err "Note (Linux): no local TTS tool found. Install one, e.g.:  sudo apt install espeak-ng"
fi
