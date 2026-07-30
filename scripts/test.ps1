<#
    Runs the quality gates: typecheck, lint and unit tests.
#>
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host '==> Typecheck...' -ForegroundColor Cyan
& npx tsc --noEmit -p ./
if ($LASTEXITCODE -ne 0) { throw "typecheck failed ($LASTEXITCODE)" }

Write-Host '==> Lint...' -ForegroundColor Cyan
& npx eslint src --ext ts
if ($LASTEXITCODE -ne 0) { throw "lint failed ($LASTEXITCODE)" }

Write-Host '==> Unit tests...' -ForegroundColor Cyan
& npx jest
if ($LASTEXITCODE -ne 0) { throw "tests failed ($LASTEXITCODE)" }

Write-Host '==> All quality gates passed.' -ForegroundColor Green
