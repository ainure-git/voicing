<#
    Produces the installable .vsix and prints its contents for verification.
#>
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

# Ensure a fresh production bundle is present.
& "$PSScriptRoot\build.ps1"
if ($LASTEXITCODE -ne 0) { throw "build failed ($LASTEXITCODE)" }

Write-Host '==> Removing old .vsix files...' -ForegroundColor Cyan
Get-ChildItem -Path $root -Filter '*.vsix' -File | Remove-Item -Force

Write-Host '==> Packaging .vsix...' -ForegroundColor Cyan
# Local-only build: relative doc links are given a placeholder base URL so vsce
# does not error about the missing repository.
& npx vsce package --no-dependencies --allow-missing-repository `
    --baseContentUrl 'https://local.invalid/tvc' `
    --baseImagesUrl 'https://local.invalid/tvc'
if ($LASTEXITCODE -ne 0) { throw "vsce package failed ($LASTEXITCODE)" }

$vsix = Get-ChildItem -Path $root -Filter '*.vsix' -File | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $vsix) { throw 'No .vsix produced.' }

Write-Host "==> Verifying package contents: $($vsix.Name)" -ForegroundColor Cyan
& npx vsce ls --tree 2>$null
Write-Host "==> VSIX ready: $($vsix.FullName)" -ForegroundColor Green
