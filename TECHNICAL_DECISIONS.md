# Decisiones técnicas y auditoría

## 1. Auditoría del entorno (máquina de desarrollo)

| Herramienta | Versión detectada |
|---|---|
| Node.js | v22.22.3 (LTS activa) |
| npm | 11.6.4 |
| Git | 2.47.1.windows.2 |
| Cursor CLI (`cursor`) | 3.13.25 |
| VS Code CLI (`code`) | 1.120.0 |
| Windows PowerShell | 5.1.26100 |
| PowerShell 7 (`pwsh`) | 7.6.3 |
| Sistema operativo | Windows 11 Home |

Voces SAPI instaladas detectadas: `Microsoft Helena Desktop` (es-ES), `Microsoft Zira Desktop` (en-US).

## 2. APIs de VS Code utilizadas (todas públicas y estables)
- `vscode.window.createStatusBarItem` — controles en la barra de estado.
- `vscode.window.createOutputChannel` — canal de diagnóstico.
- `vscode.window.activeTerminal` — detección de terminal activa.
- `vscode.window.showInformationMessage / showWarningMessage / showErrorMessage / showQuickPick`.
- `vscode.commands.getCommands(true)` — descubrimiento de comandos reales (no se inventan ids).
- `vscode.commands.executeCommand` / `registerCommand`.
- `vscode.env.clipboard.readText / writeText` — portapapeles.
- `vscode.workspace.getConfiguration` / `onDidChangeConfiguration`.
- `Terminal.sendText(text, false)` — insertar `/voice tap` sin enviar.
- Contribution points: `commands`, `menus` (`terminal/context`, `commandPalette`), `configuration`.
- `engines.vscode: ^1.85.0` (compatible con Cursor 3.13 y VS Code recientes).

## 3. Comandos detectados / resueltos en tiempo de ejecución
Nunca se codifican ids inexistentes. Se resuelven contra `getCommands(true)`:

- **Copiar selección de terminal** — candidatos, el primero disponible gana:
  `workbench.action.terminal.copySelection`, `workbench.action.terminal.copyAndClearSelection`.
  Si ninguno existe, se ofrece el fallback **Leer portapapeles**.
- **Dictado** — se filtran comandos cuyo id contiene `dictation|dictate|voice`, priorizando los que
  contienen `terminal`, luego genéricos, luego de editor (`src/dictation.ts`). Se registra en el log
  cuál se usa. Si no hay ninguno, se ofrece insertar `/voice tap` de Claude Code.

## 4. Ubicación de los controles (limitación y fallback)
VS Code **no expone** a las extensiones un contribution point para añadir botones en la **cabecera
del panel de terminal**. Alternativas públicas usadas:
1. **Barra de estado** (controles siempre visibles y dinámicos según el estado).
2. **Paleta de comandos** (todos los comandos bajo "Terminal Voice").
3. **Menú contextual de la terminal** (`terminal/context`).

En **Cursor** y **VS Code** el comportamiento es el mismo (Cursor comparte la base de VS Code).

## 5. Motor de texto a voz
- **Elección: `System.Speech.Synthesis.SpeechSynthesizer` (SAPI) vía `powershell.exe` 5.1.**
  Se prefiere Windows PowerShell 5.1 sobre `pwsh` 7 porque `System.Speech` forma parte del
  .NET Framework y siempre es cargable con `Add-Type -AssemblyName System.Speech`; en PS7 (.NET)
  ese ensamblado no está garantizado.
- **Proceso controlado y protocolo por stdin.** Un único proceso "controlador" de larga vida recibe:
  `SPEAK <base64-utf8>`, `PAUSE`, `RESUME`, `STOP`, `QUIT`. El texto **solo** viaja en Base64 por
  stdin; nunca en la línea de comandos → **inyección imposible**.
- **Sin manejadores de eventos .NET en PowerShell.** System.Speech lanza eventos en hilos de fondo
  sin *runspace* de PowerShell, lo que **cerraba el proceso con error** (comprobado: exit code 2).
  Solución: el controlador usa un lector de stdin **asíncrono** (`StreamReader.ReadLineAsync`) que se
  sondea en el hilo principal, y detecta el fin de la cola sondeando `$synth.State`. Para emitir
  `EVT done` se exige una **racha** de estados `Ready` sostenida (≈200 ms) tras un `SPEAK`, de modo que
  incluso una locución más corta que un ciclo de sondeo se reporta como completada y una locución que
  aún no ha arrancado (brevemente `Ready`) no se marca como terminada prematuramente.
- **Selección de voz por idioma.** Si `voice` está vacío, el script elige la primera voz instalada cuya
  cultura coincide con `language` (exacta y luego por prefijo, p. ej. `es`); si no hay coincidencia usa
  la voz predeterminada de SAPI.
- **`autoStopPrevious`.** Si está desactivado y ya hay una lectura activa, una nueva lectura se rechaza
  con aviso (en vez de interrumpir), única forma de honrar el ajuste con un solo proceso de voz.
- **Truncado temprano.** El texto se acota a `maxCharacters` (+ margen) **antes** de las pasadas de
  regex, para que un pegado enorme nunca congele el *extension host*.
- **Pausa/reanudación reales** con `Pause()`/`Resume()` sobre `SpeakAsync`.
- **Detención fiable** con `SpeakAsyncCancelAll()` + cierre del proceso; el host mata además el árbol
  de procesos con `taskkill /T /F` para no dejar procesos huérfanos.
- **Nueva lectura cancela la anterior**: el motor mata el proceso previo y arranca uno limpio; los
  eventos de procesos obsoletos se ignoran (comparación de referencia de proceso).

### Conversión de velocidad (multiplicador → SAPI)
La escala SAPI es −10..10 y es aproximadamente exponencial (cada +10 ≈ ×3). Se usa:

```
sapiRate = round( 10 * ln(m) / ln(3) )   acotado a [-10, 10]
```

Puntos de referencia: `1.0×→0`, `2.0×→6`, `3.0×→10`, `0.5×→-6`. Por eso el ×2 por defecto es una
**aproximación** (SAPI 6), no un doblado exacto.

## 6. Seguridad
- Texto a voz **solo** por stdin en Base64 (sin interpolación en shell).
- Argumentos numéricos (`-Rate`, `-Volume`) acotados y validados también en el propio script
  (`[ValidateRange]`).
- Nombre de voz pasado como **argv independiente** con `spawn` sin shell (seguro con espacios).
- Sin archivos temporales con texto del usuario.
- El contenido leído **nunca** se escribe en logs.

## 7. Arquitectura
Separación por responsabilidades (TypeScript estricto, sin `any`):
`config` · `configService` · `logger` · `state` (máquina de estados) · `statusBar` ·
`selection/{core,vscode}` · `textProcessing/{ansi,markdown,codeBlocks,pronunciation,chunk,index}` ·
`tts/{engine,rate,encoding,windowsRuntime,factory,unsupported}` · `dictation` · `controller` ·
`extension`. La lógica pura no importa `vscode` para ser testeable en Jest.

## 8. Compatibilidad comprobada
- **Windows 11 + PowerShell 5.1**: `list`, `test` y `controller` (SPEAK/PAUSE/RESUME/STOP/QUIT +
  `EVT done`, salida limpia) verificados manualmente. Voz es-ES disponible.
- **Terminal activa**: la lectura usa el portapapeles y el motor local de Windows, por lo que funciona
  aunque la terminal sea PowerShell, CMD, Git Bash o **WSL** (la síntesis corre en Windows local).
- **macOS/Linux**: la extensión carga y funciona salvo la síntesis de voz, que avisa de que el motor
  es de Windows en esta versión. Estructura preparada (`tts/factory` + interfaz `TtsEngine`) para
  añadir motores `say` (macOS) o `spd-say`/`espeak` (Linux).
- No se afirma compatibilidad no probada.

## 9. Pruebas
96 pruebas unitarias (Jest + ts-jest) cubriendo limpieza ANSI/control, Markdown, bloques de código,
truncado y fragmentación, conversión de velocidad, validación de configuración, protección de
inyección, restauración del portapapeles (mocks), máquina de estados y ciclo de vida/cancelación del
motor TTS (spawn simulado). Más pruebas de compilación, lint y empaquetado. Smoke test manual del
motor de voz documentado en `TROUBLESHOOTING.md`.
