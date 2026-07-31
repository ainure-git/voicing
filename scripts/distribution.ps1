<#
    Assembles the 'distribucion/' folder (VSIX + docs + installers) and a ZIP
    ready to hand to another person. Does NOT include the development folder.
#>
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$version = (Get-Content "$root\package.json" -Raw | ConvertFrom-Json).version

$vsix = Get-ChildItem -Path $root -Filter '*.vsix' -File | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $vsix) { throw "No .vsix found. Run scripts\package.ps1 first." }

$dist = Join-Path $root 'distribucion'
if (Test-Path $dist) { Remove-Item $dist -Recurse -Force }
New-Item -ItemType Directory -Path $dist | Out-Null

# The exact set of files the recipient needs.
$docs = @(
    'INSTALAR.txt',
    'CAMBIOS.md',
    'PRIVACY.md',
    'TROUBLESHOOTING.md',
    'INSTALAR_EN_CURSOR.bat',
    'DESINSTALAR_DE_CURSOR.bat'
)

Copy-Item $vsix.FullName -Destination $dist
foreach ($doc in $docs) {
    $src = Join-Path $root $doc
    if (-not (Test-Path $src)) { throw "Missing distribution file: $doc" }
    Copy-Item $src -Destination $dist
}

$zipName = "voicing-$version.zip"
$zipPath = Join-Path $dist $zipName
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

# The ZIP contains the VSIX + docs + installers (a self-contained bundle).
$zipItems = @($vsix.FullName) + ($docs | ForEach-Object { Join-Path $root $_ })
Compress-Archive -Path $zipItems -DestinationPath $zipPath -Force

Write-Host '==> Distribution ready.' -ForegroundColor Green
Write-Host ""
Write-Host "  Carpeta : $dist"
Write-Host "  VSIX    : $(Join-Path $dist $vsix.Name)"
Write-Host "  ZIP     : $zipPath"
Write-Host ""
Get-ChildItem $dist | Select-Object Name, Length | Format-Table -AutoSize
