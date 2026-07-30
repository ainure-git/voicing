# Solución de problemas

## No aparece el botón
- Comprueba que `terminalVoice.enabled` y `terminalVoice.showStatusBarControls` están en `true`.
- Los controles están en la **barra de estado inferior derecha**, en la **paleta** (`Ctrl+Shift+P` →
  "Terminal Voice") y en el **menú contextual de la terminal** (clic derecho en la terminal).
- Recuerda: VS Code **no** permite poner botones en la cabecera del panel de terminal; por eso se
  usan esas ubicaciones.
- Tras instalar el `.vsix`, **recarga** la ventana (`Developer: Reload Window`).

## No hay voz en español
- `Ctrl+Shift+P` → **Terminal Voice: Mostrar voces disponibles**. Si no aparece ninguna `es-*`:
  - Windows → *Configuración* → *Hora e idioma* → *Voz* → añade una voz en español
    (p. ej. *Microsoft Helena*).
  - Reinicia el editor y vuelve a elegir la voz.
- Si hay voz pero no la usa, fija `terminalVoice.voice` con el nombre exacto que muestra la lista.

## No se detecta la selección
- Asegúrate de **seleccionar** el texto en la terminal antes de pulsar "Leer selección".
- Si ves *"no encuentro el comando para copiar la selección"*, usa **Leer portapapeles**:
  copia con `Ctrl+C` y ejecuta **Terminal Voice: Leer portapapeles**.
- Algunos temas/terminales requieren clic dentro de la terminal para darle foco antes de seleccionar.

## El dictado integrado no está disponible
- Es normal en muchas versiones: no todas exponen un comando de dictado.
- Usa el dictado nativo de **Claude Code**: **Terminal Voice: Dictar** → *Insertar "/voice tap"*, y
  pulsa Enter tú mismo en la terminal.

## PowerShell bloqueado / no habla
- La extensión ejecuta el script con `-ExecutionPolicy Bypass` en un proceso aislado, sin cambiar tu
  política global. Aun así, si tu organización bloquea `powershell.exe`:
  - Verifica que existe `C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe`.
  - Prueba en una terminal: 
    ```
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Add-Type -AssemblyName System.Speech; (New-Object System.Speech.Synthesis.SpeechSynthesizer).Speak('prueba')"
    ```
  - Si eso no suena, el problema es del sistema (audio/políticas), no de la extensión.
- Activa `terminalVoice.debugLogging` y revisa el canal **Terminal Voice Controls** en la vista de
  Salida (nunca registra el texto leído, solo diagnósticos).

## El proceso de voz no se detiene
- Pulsa **Terminal Voice: Detener**. La extensión envía `STOP`+`QUIT` y además mata el árbol de
  procesos con `taskkill /T /F`.
- Al cerrar la ventana o recargar, la extensión también cierra el proceso.
- Si sospechas de un proceso huérfano: *Administrador de tareas* → busca `powershell.exe`; no debería
  quedar ninguno de la extensión tras detener/cerrar.

## Cursor no reconoce el VSIX
- Usa `Ctrl+Shift+P` → **`Extensions: Install from VSIX...`** y elige el archivo `.vsix` completo.
- Asegúrate de que el archivo no está bloqueado por Windows (clic derecho → Propiedades → *Desbloquear*).
- Alternativa por CLI: `cursor --install-extension terminal-voice-controls-<versión>.vsix`.

## WSL
- Si tu terminal activa es **WSL**, la lectura sigue funcionando: el texto se toma del portapapeles y
  la síntesis corre en **Windows local** (no dentro de WSL).

## Diferencias entre Cursor y VS Code
- Son equivalentes en cuanto a esta extensión (Cursor comparte la base de VS Code). Los ids de
  comandos (copia de terminal, dictado) se **descubren en tiempo de ejecución**, así que la extensión
  se adapta a lo que cada editor tenga registrado.

## macOS / Linux
- El **motor de voz** de esta versión es de Windows. En otros sistemas la extensión no se rompe: el
  procesamiento de texto y los comandos funcionan, pero la lectura avisa de que el motor es de Windows.
