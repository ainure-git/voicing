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

printf '\n'
printf '\033[32m  ============================================================\033[0m\n'
printf '\033[32m   Voicing installed into %s editor(s). Quick start:\033[0m\n' "$INSTALLED"
printf '\033[32m  ============================================================\033[0m\n\n'
printf '\033[37m  1) RELOAD your editor window (required):\033[0m\n'
printf '       Cmd/Ctrl+Shift+P  ->  Developer: Reload Window\n\n'
printf '  2) Where are the controls?\n'
printf '       - Status bar, bottom-right (near the bell): mic and speaker icons\n'
printf "       - Command Palette: Cmd/Ctrl+Shift+P, type 'Voicing'\n"
printf '       - Right-click inside the terminal\n\n'
printf '\033[37m  3) LISTEN to terminal text (most reliable way):\033[0m\n'
printf "       select the text -> right-click -> 'Voicing: Read selection'\n"
printf "       (or copy with Cmd/Ctrl+C and use 'Voicing: Read clipboard')\n\n"
printf "  4) Speed & voice: open Settings and search 'Voicing'.\n"
printf "       Try 'Voicing: Test voice' and 'Voicing: Show available voices'.\n\n"
printf '\033[37m  5) DICTATE (mic): uses your editor native terminal dictation if it\033[0m\n'
printf "\033[37m     exists; otherwise it inserts Claude Code's '/voice tap'.\033[0m\n"
printf '\033[33m     -> The mic is only useful if you use Claude Code. The speaker always works.\033[0m\n\n'
printf '\033[90m  100%% local - no cloud, no API keys, no telemetry.\033[0m\n'
printf '\033[90m  Help & troubleshooting: https://github.com/ainure-git/voicing#usage\033[0m\n\n'
printf '\033[36m  ES | Recarga la ventana. Para ESCUCHAR: selecciona en la terminal ->\033[0m\n'
printf "\033[36m       clic derecho -> 'Voicing: Read selection' (o Ctrl+C y el altavoz).\033[0m\n"
printf '\033[36m       El microfono necesita Claude Code; el altavoz funciona siempre.\033[0m\n\n'

if ! { command -v spd-say >/dev/null 2>&1 || command -v espeak-ng >/dev/null 2>&1 || command -v espeak >/dev/null 2>&1 || command -v say >/dev/null 2>&1; }; then
  err "Note (Linux): no local TTS tool found. Install one, e.g.:  sudo apt install espeak-ng"
fi
