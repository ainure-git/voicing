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

Write-Host "==> Done. Installed into $installed editor(s). Reload the window to activate." -ForegroundColor Green
