@echo off
setlocal enabledelayedexpansion
title Desinstalar Terminal Voice Controls de Cursor

set "EXTID=eureka-local.terminal-voice-controls"

echo ==========================================================
echo   Desinstalar Terminal Voice Controls de Cursor
echo ==========================================================
echo.
echo Extension: !EXTID!
echo (No se borraran tus ajustes personales sin avisar.)
echo.

where cursor >nul 2>nul
if errorlevel 1 (
  echo No se ha encontrado el comando "cursor".
  echo.
  echo DESINSTALACION MANUAL:
  echo   1. Abre Cursor.
  echo   2. Ve al panel de Extensiones (Ctrl+Shift+X).
  echo   3. Busca "Terminal Voice Controls".
  echo   4. Pulsa el engranaje ^> Uninstall (Desinstalar).
  echo   5. Recarga Cursor.
  echo.
  pause
  exit /b 0
)

set /p CONFIRM="Desinstalar la extension ahora? (S/N): "
if /I not "!CONFIRM!"=="S" (
  echo Operacion cancelada.
  echo.
  pause
  exit /b 0
)

echo.
echo Desinstalando...
cursor --uninstall-extension "!EXTID!"
if errorlevel 1 (
  echo.
  echo La desinstalacion mediante CLI ha fallado (quiza no estaba instalada).
  echo Puedes desinstalarla manualmente desde el panel de Extensiones.
  echo.
  pause
  exit /b 1
)

echo.
echo Desinstalada. Recarga Cursor para completar.
echo.
pause
exit /b 0
