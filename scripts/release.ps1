<#
    Full local release flow: dependencies, quality gates, build, package,
    verify and distribution. Stops on the first error with a non-zero exit code.
#>
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

function Assert-Command {
    param([string]$Name)
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Required command not found: $Name"
    }
}

try {
    Write-Host '===============================================' -ForegroundColor Magenta
    Write-Host ' Terminal Voice Controls - release local' -ForegroundColor Magenta
    Write-Host '===============================================' -ForegroundColor Magenta

    Write-Host '==> Checking Node.js and npm...' -ForegroundColor Cyan
    Assert-Command 'node'
    Assert-Command 'npm'
    Write-Host "    node $(node --version)  npm $(npm --version)"

    if (-not (Test-Path (Join-Path $root 'node_modules'))) {
        Write-Host '==> Installing dependencies (npm ci)...' -ForegroundColor Cyan
        & npm ci
        if ($LASTEXITCODE -ne 0) {
            Write-Host '    npm ci failed; falling back to npm install...' -ForegroundColor Yellow
            & npm install
            if ($LASTEXITCODE -ne 0) { throw "npm install failed ($LASTEXITCODE)" }
        }
    }

    & "$PSScriptRoot\test.ps1"
    if ($LASTEXITCODE -ne 0) { throw "quality gates failed" }

    & "$PSScriptRoot\package.ps1"
    if ($LASTEXITCODE -ne 0) { throw "packaging failed" }

    & "$PSScriptRoot\distribution.ps1"
    if ($LASTEXITCODE -ne 0) { throw "distribution failed" }

    Write-Host ''
    Write-Host '===============================================' -ForegroundColor Green
    Write-Host ' RELEASE OK' -ForegroundColor Green
    Write-Host '===============================================' -ForegroundColor Green
    exit 0
}
catch {
    Write-Host ''
    Write-Host "RELEASE FAILED: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
