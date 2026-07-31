<p align="center">
  <img src="media/banner.png" alt="Voicing — Listen to your terminal. Dictate into it." width="100%">
</p>

<h1 align="center">Voicing</h1>

<p align="center">
  <b>Listen to your integrated terminal — and dictate into it.</b><br>
  Select any terminal output (a long Claude Code / Codex answer, a stack trace, an error) and hear it read aloud at ~2×, with pause &amp; stop. 100% local: no cloud, no API keys, no telemetry.
</p>

<p align="center">
  <a href="https://github.com/ainure-git/voicing/actions/workflows/ci.yml"><img src="https://github.com/ainure-git/voicing/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <img src="https://img.shields.io/badge/tests-110%20passing-brightgreen" alt="tests">
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="license">
  <img src="https://img.shields.io/badge/VS%20Code-%5E1.85-007ACC?logo=visualstudiocode&logoColor=white" alt="vscode engine">
  <img src="https://img.shields.io/badge/telemetry-none-success" alt="no telemetry">
</p>

<p align="center">
  Works in <b>VS Code</b>, <b>Cursor</b>, <b>Windsurf</b>, <b>VSCodium</b> and other VS Code-based editors · <b>Windows</b> · <b>macOS</b> · <b>Linux</b>
</p>

---

## ✨ Features

- 🔊 **Read the terminal aloud** — hear long answers instead of reading them.
- 📋 **Read the clipboard** — a rock-solid fallback (`Ctrl+C`, then listen).
- ⏯️ **Pause / resume** and ⏹️ **stop** — real controls, and a new read cleanly cancels the previous one.
- ⚡ **~2× speed** by default, configurable `0.5–3.0`.
- 🗣️ **Local OS voice**, selectable — Windows SAPI · macOS `say` · Linux `espeak-ng`/`spd-say`.
- 🧹 **Smart text cleanup** — strips ANSI/control codes, converts Markdown, and can skip, announce, or read code blocks; improves pronunciation of paths, URLs, `camelCase`, `snake_case` and TypeScript errors.
- 🎙️ **Dictate** — uses your editor's native terminal dictation if present; otherwise helps you use Claude Code's `/voice tap`.
- 🔒 **Private by design** — the text you hear never leaves your machine. No accounts, no keys, no telemetry.

## 🚀 Install

### One-liner (recommended)

Installs the latest release into **every** VS Code-family editor found on your machine.

**macOS / Linux**
```bash
curl -fsSL https://raw.githubusercontent.com/ainure-git/voicing/main/scripts/install.sh | bash
```

**Windows (PowerShell)**
```powershell
irm https://raw.githubusercontent.com/ainure-git/voicing/main/scripts/install.ps1 | iex
```

Then **reload the window** (`Ctrl/Cmd + Shift + P` → *Developer: Reload Window*).

### From the `.vsix` (always works)

1. Download `voicing-<version>.vsix` from the [latest release](https://github.com/ainure-git/voicing/releases/latest).
2. In your editor: `Ctrl/Cmd + Shift + P` → **Extensions: Install from VSIX…** → pick the file.
3. Reload the window.

Or from a terminal, with any of these CLIs:
```bash
code   --install-extension voicing-<version>.vsix   # VS Code / VSCodium
cursor --install-extension voicing-<version>.vsix   # Cursor
windsurf --install-extension voicing-<version>.vsix # Windsurf
```

> **Open VSX / Marketplace:** publishing is opt-in (see [release workflow](.github/workflows/release.yml)). Until then, use the one-liner or the `.vsix` above.

## 🎧 Usage

The controls live in the **status bar** (bottom-right, next to the 🔔), in the **Command Palette** (search *Voicing*), and in the **terminal right-click menu**.

| Control | What it does |
|---|---|
| `$(mic)` **Dictate** | Uses native terminal dictation if available, else inserts Claude Code's `/voice tap`. |
| `$(unmute)` **Read selection** | Reads the current terminal selection. |
| `$(clippy)` **Read clipboard** | Reads clipboard text (copy with `Ctrl+C` first). |
| `$(debug-pause)` **Pause / resume** | Toggles playback (shown while active). |
| `$(debug-stop)` **Stop** | Stops playback and cleans up the voice process. |

**Reading a terminal selection** (choose whichever fits):
- **Right-click** in the terminal → **Voicing: Read selection** — most reliable with the mouse (the terminal keeps focus &amp; selection).
- Select → `Ctrl+C` → **Read clipboard** (or the status-bar 🔊, which offers it).
- Bind a key to `voicing.readSelection` and trigger it while the terminal is focused.

> ℹ️ Clicking the status-bar 🔊 makes the terminal lose focus, and the editor clears the terminal selection at that moment — a platform limitation. That's why the right-click menu / clipboard paths are the reliable ones, and the button gracefully offers **Read clipboard**.

## ⚙️ Configuration

Search **“Voicing”** in Settings (or run **Voicing: Open settings**).

| Setting | Default | Description |
|---|---|---|
| `voicing.enabled` | `true` | Enable the extension and its controls. |
| `voicing.language` | `es-ES` | Preferred voice language (used to pick a voice when none is fixed). |
| `voicing.rate` | `2.0` | Speed multiplier `0.5–3.0` (2.0 ≈ double). |
| `voicing.volume` | `100` | Volume `0–100`. |
| `voicing.voice` | `""` | Exact voice name (empty = default). Use **Voicing: Show available voices**. |
| `voicing.skipCodeBlocks` | `true` | If `false`, read code blocks in full. |
| `voicing.codeBlockMode` | `announce` | `skip` · `announce` · `read`. |
| `voicing.maxCharacters` | `30000` | Max characters to read (rest truncated with a notice). |
| `voicing.restoreClipboard` | `true` | Restore the previous clipboard after reading a selection. |
| `voicing.showStatusBarControls` | `true` | Show the status-bar controls. |
| `voicing.autoStopPrevious` | `true` | A new read stops the previous one. |
| `voicing.debugLogging` | `false` | Diagnostics in the output channel (never the read text). |

No keyboard shortcuts are imposed (to avoid conflicts). Bind your own to any `voicing.*` command in **Keyboard Shortcuts**.

## 🖥️ Platform support

| Platform | Engine | Read | Stop | Speed / Voice | Pause / Resume | Status |
|---|---|:--:|:--:|:--:|:--:|---|
| **Windows 10/11** | `System.Speech` (SAPI) via PowerShell | ✅ | ✅ | ✅ | ✅ | **Verified** |
| **macOS** | `say` | ✅ | ✅ | ✅ | ✅¹ | Experimental² |
| **Linux** | `espeak-ng` / `espeak` | ✅ | ✅ | ✅ | ✅¹ | Experimental² |
| **Linux** | `spd-say` (fallback) | ✅ | ✅ | ✅ | ⚠️³ | Experimental² |

<sub>¹ Pause/resume via `SIGSTOP`/`SIGCONT`. ² Implemented and unit-tested (arg building + lifecycle) but not yet verified on real macOS/Linux hardware — testers welcome! ³ `spd-say` talks to a daemon, so pausing the client may not pause audio; prefer `espeak-ng` on Linux (`sudo apt install espeak-ng`).</sub>

## 🔒 Privacy

Everything runs locally. **No telemetry. No network. No API keys.** The text you listen to is synthesized by your OS's local voice and is never sent anywhere or stored, and never written to logs. To read a terminal selection the extension briefly uses the clipboard and then restores it. See [PRIVACY.md](PRIVACY.md).

## 🧩 How it works

The text pipeline cleans ANSI/control codes → handles code blocks → converts Markdown → improves pronunciation → truncates &amp; chunks. Each OS has a small TTS engine behind a shared interface; text is handed to the voice process **only over stdin (Base64 on Windows) or as an isolated argv element — never through a shell**, so command injection is impossible. Details in [TECHNICAL_DECISIONS.md](TECHNICAL_DECISIONS.md).

## 🛠️ Development

```bash
npm ci
npm run typecheck && npm run lint && npm test   # quality gates (110 unit tests)
node esbuild.js --production                      # bundle
npx vsce package --no-dependencies               # build the .vsix
```

Bump the version in `package.json`, then push a tag `vX.Y.Z` — the [release workflow](.github/workflows/release.yml) builds the `.vsix` and attaches it to a GitHub Release.

## 🤝 Contributing

Issues and PRs welcome — especially **macOS/Linux testing reports**. See [CONTRIBUTING.md](CONTRIBUTING.md). Security policy in [SECURITY.md](SECURITY.md).

## 📄 License

[MIT](LICENSE) · [Changelog](CAMBIOS.md) · [Troubleshooting](TROUBLESHOOTING.md)

---

<details>
<summary><b>🇪🇸 Resumen en español</b></summary>

**Voicing** te permite **escuchar la terminal** y **dictar** en ella dentro de VS Code, Cursor, Windsurf, VSCodium, etc. Selecciona una respuesta larga (de Claude Code, Codex, un error…) y escúchala a ~2×, con pausa y parada. **100% local: sin nube, sin claves, sin telemetría** — no cuesta nada.

**Instalar (una línea):**
- macOS/Linux: `curl -fsSL https://raw.githubusercontent.com/ainure-git/voicing/main/scripts/install.sh | bash`
- Windows: `irm https://raw.githubusercontent.com/ainure-git/voicing/main/scripts/install.ps1 | iex`

Luego **recarga la ventana**. También puedes instalar el `.vsix` de la [última release](https://github.com/ainure-git/voicing/releases/latest) con **Extensions: Install from VSIX…**.

**Leer una selección de la terminal (lo más fiable):** clic derecho en la terminal → **Voicing: Read selection**, o `Ctrl+C` → **Read clipboard**. Los iconos 🎤/🔊 están abajo a la derecha, junto a la 🔔.

Motores de voz: Windows (SAPI, verificado), macOS (`say`) y Linux (`espeak-ng`/`spd-say`) — estos dos últimos, experimentales (se agradecen pruebas). Más detalles en [TROUBLESHOOTING.md](TROUBLESHOOTING.md) y [PRIVACY.md](PRIVACY.md).

</details>
