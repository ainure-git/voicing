# Terminal Voice Controls

Dicta y **escucha** el texto de la terminal integrada de Cursor o Visual Studio Code.
Pensada para trabajar con Claude Code, Codex y otras herramientas de terminal: selecciona
una respuesta larga y escúchala a ~×2, con pausa, reanudación y detención. Todo **local**,
sin nube, sin claves API y sin telemetría.

- 🎧 **Leer selección**: escucha el texto seleccionado en la terminal.
- 📋 **Leer portapapeles**: alternativa fiable (copias con `Ctrl+C` y reproduces).
- ⏯️ **Pausar / reanudar** y ⏹️ **detener** la lectura.
- ⚡ **Velocidad ~×2** por defecto (configurable 0.5–3.0).
- 🗣️ **Voz local de Windows** (System.Speech / SAPI), seleccionable.
- 🎙️ **Dictar**: usa el dictado integrado del editor si existe; si no, te ayuda con `/voice tap` de Claude Code.

> **Plataforma:** el motor de voz de esta versión está orientado a **Windows 10/11**.
> En macOS/Linux la extensión no se rompe: el procesamiento de texto y los comandos siguen
> disponibles, pero la lectura en voz avisa de que el motor es de Windows.

---

## Controles

Los controles aparecen en varios sitios (VS Code no permite a las extensiones poner botones
directamente en la cabecera del panel de terminal, así que usamos las ubicaciones públicas):

| Control | Dónde aparece |
|---|---|
| `$(mic)` Dictar | Barra de estado · Paleta de comandos · Menú contextual de la terminal |
| `$(unmute)` Leer selección | Barra de estado · Paleta de comandos · Menú contextual de la terminal |
| `$(debug-pause)` Pausar/Reanudar | Barra de estado (durante la lectura) · Paleta · Menú contextual |
| `$(debug-stop)` Detener | Barra de estado (durante la lectura) · Paleta · Menú contextual |

Estado discreto en la barra de estado: **Preparando · Reproduciendo · Pausado · Detenido · Error**.

Todos los comandos están en la paleta (`Ctrl+Shift+P`) bajo **"Terminal Voice"**.

---

## Instalación en Cursor

1. Abre Cursor.
2. `Ctrl + Shift + P`.
3. Escribe y elige **`Extensions: Install from VSIX...`**.
4. Selecciona `terminal-voice-controls-<versión>.vsix`.
5. Recarga Cursor cuando lo pida.

O ejecuta `INSTALAR_EN_CURSOR.bat` (incluido en la distribución) si tienes el comando `cursor` en el PATH.

## Instalación en Visual Studio Code

Igual que en Cursor: `Ctrl+Shift+P` → **`Extensions: Install from VSIX...`** → elige el `.vsix` → recarga.

---

## Uso

### Leer una selección de la terminal
1. Selecciona texto con el ratón en la terminal integrada.
2. Pulsa el botón `$(unmute)` de la barra de estado, o `Ctrl+Shift+P` → **Terminal Voice: Leer selección**.
3. La extensión copia la selección de forma segura (con restauración del portapapeles) y la lee.

Si no hay selección, verás: *"Selecciona texto de la terminal antes de reproducirlo"*.

### Leer el portapapeles (alternativa)
1. Copia con `Ctrl+C`.
2. `Ctrl+Shift+P` → **Terminal Voice: Leer portapapeles**.

### Pausar / reanudar / detener
- **Pausar o reanudar**: botón `$(debug-pause)` / `$(debug-continue)` o **Terminal Voice: Pausar o reanudar**.
- **Detener**: botón `$(debug-stop)` o **Terminal Voice: Detener**. Detiene realmente la voz y cierra el proceso.

Una nueva lectura **cancela limpiamente** la anterior.

### Dictado
`Ctrl+Shift+P` → **Terminal Voice: Dictar**.
- Si tu editor tiene un comando de dictado registrado, se ejecuta (se indica cuál en el log de diagnóstico).
- Si no, se te ofrece insertar `/voice tap` (dictado nativo de Claude Code) en la terminal activa —
  **no se envía solo**, tú decides cuándo pulsar Enter.

---

## Configuración

Ajustes → busca **"Terminal Voice"** (o `Ctrl+Shift+P` → **Terminal Voice: Abrir configuración**).

| Ajuste | Por defecto | Descripción |
|---|---|---|
| `terminalVoice.enabled` | `true` | Activa la extensión y sus controles. |
| `terminalVoice.language` | `es-ES` | Idioma preferido de la voz. |
| `terminalVoice.rate` | `2.0` | Velocidad 0.5–3.0 (2.0 ≈ ×2). |
| `terminalVoice.volume` | `100` | Volumen 0–100. |
| `terminalVoice.voice` | `""` | Voz exacta a usar (vacío = predeterminada). |
| `terminalVoice.skipCodeBlocks` | `true` | Si es `false`, lee los bloques de código completos. |
| `terminalVoice.codeBlockMode` | `announce` | `skip` · `announce` · `read`. |
| `terminalVoice.maxCharacters` | `30000` | Máximo de caracteres; el resto se trunca con aviso. |
| `terminalVoice.restoreClipboard` | `true` | Restaura el portapapeles tras leer la selección. |
| `terminalVoice.showStatusBarControls` | `true` | Muestra los controles en la barra de estado. |
| `terminalVoice.autoStopPrevious` | `true` | Una lectura nueva detiene la anterior. |
| `terminalVoice.debugLogging` | `false` | Diagnóstico en el canal de salida (nunca el texto leído). |

### Cambiar la voz
`Ctrl+Shift+P` → **Terminal Voice: Mostrar voces disponibles** → elige una. Se guarda en `terminalVoice.voice`.
Prueba con **Terminal Voice: Probar voz**.

### Velocidad ×2
`terminalVoice.rate = 2.0`. La conversión a la escala del motor (SAPI −10..10) es aproximada;
ver [`TECHNICAL_DECISIONS.md`](./TECHNICAL_DECISIONS.md).

### Atajos de teclado
No se imponen atajos (para evitar conflictos). Puedes asignar los tuyos en
**Preferencias: Abrir atajos de teclado** buscando los comandos `terminalVoice.*`.

---

## Privacidad
Todo es local. No hay telemetría, ni claves, ni envío del texto leído a ningún servidor.
Ver [`PRIVACY.md`](./PRIVACY.md).

## Limitaciones conocidas
- Motor de voz solo Windows en esta versión (arquitectura preparada para añadir macOS/Linux).
- Los botones no pueden colocarse en la cabecera del panel de terminal (limitación de la API pública de VS Code); se usan barra de estado, paleta y menú contextual.
- La captura automática de selección depende del comando de copia de la terminal del editor; si no existe, usa **Leer portapapeles**.
- La velocidad ×2 es aproximada (el motor usa una escala discreta).

## Solución de problemas
Ver [`TROUBLESHOOTING.md`](./TROUBLESHOOTING.md).

## Cómo actualizar
Instala el nuevo `.vsix` con **`Extensions: Install from VSIX...`** (sustituye la versión anterior) y recarga.

## Cómo desinstalar
Panel de **Extensiones** → **Terminal Voice Controls** → **Uninstall**. O ejecuta `DESINSTALAR_DE_CURSOR.bat`.

## Licencia
MIT — ver [`LICENSE`](./LICENSE).
