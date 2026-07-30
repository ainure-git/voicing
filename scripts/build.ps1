<#
    Compiles (bundles) the extension for production.
#>
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host '==> Building (production bundle)...' -ForegroundColor Cyan
& node esbuild.js --production
if ($LASTEXITCODE -ne 0) { throw "esbuild failed ($LASTEXITCODE)" }

Write-Host '==> Build OK: dist/extension.js' -ForegroundColor Green
