@echo off
setlocal enabledelayedexpansion
title Instalar Voicing en Cursor

echo ==========================================================
echo   Instalar Voicing en Cursor
echo ==========================================================
echo.

rem --- Buscar el .vsix en esta misma carpeta (rutas relativas) ---
set "VSIX="
for %%F in ("%~dp0voicing-*.vsix") do set "VSIX=%%~fF"

if not defined VSIX (
  echo No se encontro ningun archivo .vsix en esta carpeta.
  echo Asegurate de tener "voicing-<version>.vsix" junto a este .bat.
  echo.
  pause
  exit /b 1
)

for %%A in ("%VSIX%") do set "VSIXNAME=%%~nxA"
echo Se instalara: !VSIXNAME!
echo.

rem --- Comprobar si el comando 'cursor' esta disponible ---
where cursor >nul 2>nul
if errorlevel 1 (
  echo No se ha encontrado el comando "cursor" en el sistema.
  echo.
  echo INSTALACION MANUAL (siempre funciona^):
  echo   1. Abre Cursor.
  echo   2. Pulsa Ctrl+Shift+P.
  echo   3. Escribe: Install from VSIX  y elige "Extensions: Install from VSIX..."
  echo   4. Selecciona el archivo: !VSIXNAME!
  echo   5. Recarga Cursor.
  echo.
  if exist "%~dp0INSTALAR.txt" (
    echo Abriendo INSTALAR.txt con las instrucciones...
    start "" notepad "%~dp0INSTALAR.txt"
  )
  echo.
  pause
  exit /b 0
)

echo Se ha detectado el comando "cursor".
set /p CONFIRM="Instalar ahora? (S/N): "
if /I not "!CONFIRM!"=="S" (
  echo Instalacion cancelada.
  echo.
  pause
  exit /b 0
)

echo.
echo Instalando...
cursor --install-extension "%VSIX%"
if errorlevel 1 (
  echo.
  echo La instalacion mediante CLI ha fallado.
  echo Usa la instalacion manual: Ctrl+Shift+P ^> "Extensions: Install from VSIX..."
  echo.
  pause
  exit /b 1
)

echo.
echo ==========================================================
echo   Instalacion completada.
echo   IMPORTANTE: recarga Cursor (cierra y abre, o "Developer: Reload Window").
echo ==========================================================
echo.
pause
exit /b 0
