@echo off
title Empaquetar Terminal Voice Controls (build + test + vsix + distribucion)

echo ==========================================================
echo   Terminal Voice Controls - EMPAQUETAR
echo   (comprueba, prueba, compila, empaqueta y distribuye)
echo ==========================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js no esta instalado o no esta en el PATH.
  echo Instala Node.js LTS desde https://nodejs.org y vuelve a intentarlo.
  echo.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo ERROR: npm no esta disponible.
  echo.
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\release.ps1"
set "RC=%ERRORLEVEL%"

echo.
if not "%RC%"=="0" (
  echo ==========================================================
  echo   FALLO EL EMPAQUETADO (codigo %RC%). Revisa los mensajes.
  echo ==========================================================
  pause
  exit /b %RC%
)

echo Artefactos en la carpeta "distribucion".
echo.
pause
exit /b 0
