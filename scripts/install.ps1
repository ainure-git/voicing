<#
    Voicing - one-line installer for Windows.
    Downloads the latest .vsix from GitHub Releases and installs it into every
    detected VS Code-family editor (VS Code, Cursor, Windsurf, VSCodium, ...).

    Usage (PowerShell):
      irm https://raw.githubusercontent.com/ainure-git/voicing/main/scripts/install.ps1 | iex
#>
$ErrorActionPreference = 'Stop'
$repo = 'ainure-git/voicing'

Write-Host '==> Finding the latest Voicing release...' -ForegroundColor Cyan
$headers = @{ 'User-Agent' = 'voicing-installer' }
$release = Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/releases/latest" -Headers $headers
$asset = $release.assets | Where-Object { $_.name -like '*.vsix' } | Select-Object -First 1
if (-not $asset) {
    Write-Host "No .vsix asset found in the latest release. See https://github.com/$repo/releases" -ForegroundColor Red
    exit 1
}

$vsix = Join-Path $env:TEMP $asset.name
Write-Host "==> Downloading $($asset.name) ..." -ForegroundColor Cyan
Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $vsix -Headers $headers

$installed = 0
foreach ($cli in @('code', 'code-insiders', 'cursor', 'windsurf', 'codium', 'vscodium')) {
    $cmd = Get-Command $cli -ErrorAction SilentlyContinue
    if ($cmd) {
        Write-Host "==> Installing into '$cli' ..." -ForegroundColor Cyan
        try {
            & $cli --install-extension $vsix | Out-Null
            $installed++
            Write-Host '    OK' -ForegroundColor Green
        }
        catch {
            Write-Host "    Failed to install into $cli (continuing)." -ForegroundColor Red
        }
    }
}

if ($installed -eq 0) {
    Write-Host 'No supported editor CLI found (code / cursor / windsurf / codium).' -ForegroundColor Red
    Write-Host "Install the .vsix manually: https://github.com/$repo/releases/latest" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "  ============================================================" -ForegroundColor Green
Write-Host "   Voicing installed into $installed editor(s). Quick start:" -ForegroundColor Green
Write-Host "  ============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  1) RELOAD your editor window  (this step is required):" -ForegroundColor White
Write-Host "       Ctrl+Shift+P  ->  Developer: Reload Window"
Write-Host ""
Write-Host "  2) Where are the controls?"
Write-Host "       - Status bar, bottom-right (near the bell): mic and speaker icons"
Write-Host "       - Command Palette: press Ctrl+Shift+P and type 'Voicing'"
Write-Host "       - Right-click inside the terminal"
Write-Host ""
Write-Host "  3) LISTEN to terminal text (most reliable way):" -ForegroundColor White
Write-Host "       select the text -> right-click -> 'Voicing: Read selection'"
Write-Host "       (or copy with Ctrl+C and click the speaker / 'Voicing: Read clipboard')"
Write-Host ""
Write-Host "  4) Speed & voice: open Settings and search 'Voicing'."
Write-Host "       Try 'Voicing: Test voice' and 'Voicing: Show available voices'."
Write-Host "       No Spanish voice? Windows Settings > Time & language > Speech > add one."
Write-Host ""
Write-Host "  5) DICTATE (mic): uses your editor's native terminal dictation if it" -ForegroundColor White
Write-Host "     exists; otherwise it inserts Claude Code's '/voice tap'." -ForegroundColor White
Write-Host "     -> The mic is only useful if you use Claude Code. The speaker always works." -ForegroundColor Yellow
Write-Host ""
Write-Host "  100% local - no cloud, no API keys, no telemetry." -ForegroundColor DarkGray
Write-Host "  Help & troubleshooting: https://github.com/ainure-git/voicing#usage" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  ES | Recarga la ventana. Para ESCUCHAR: selecciona en la terminal ->" -ForegroundColor Cyan
Write-Host "       clic derecho -> 'Voicing: Read selection' (o Ctrl+C y el altavoz)." -ForegroundColor Cyan
Write-Host "       El microfono necesita Claude Code (/voice tap); el altavoz funciona siempre." -ForegroundColor Cyan
Write-Host ""
