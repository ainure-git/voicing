# Cambios / Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/). Versionado [SemVer](https://semver.org/).

## [0.1.2] — 2026-07-31

### Corregido
- **Dictado**: ya no usa el dictado de chat/editor de Cursor (escribe en el chat, en inglés). Solo se
  usa dictado **nativo de terminal** si existe; en caso contrario se ofrece `/voice tap` de Claude Code.
- **Leer selección**: eliminado el re-enfoque programático de la terminal, que podía **borrar la
  selección** y romper la vía fiable. La forma fiable de leer una selección con el ratón es el
  **clic derecho en la terminal → "Terminal Voice: Leer selección"** (la terminal mantiene el foco y
  la selección). El botón de la barra de estado, al hacer clic, provoca que xterm pierda la selección;
  por eso ofrece **Leer portapapeles** como alternativa (`Ctrl+C` y reproducir).

## [0.1.1] — 2026-07-31

### Corregido
- **Dictado**: el detector de comando ya no coincide por error con el canal de salida de la propia
  extensión (contenía "voice"). Ahora solo reconoce comandos reales de *dictation/dictate* y excluye
  los comandos de Output. Si no hay dictado integrado, ofrece `/voice tap`.
- **Leer selección**: al pulsar el icono de la barra de estado la terminal perdía el foco y
  `copySelection` (condicionado a `terminalFocus`) no copiaba → "no hay selección". Ahora se re-enfoca
  la terminal antes de copiar (conservando la selección) y, si aun así no hay selección, se ofrece
  **Leer portapapeles**. Tiempo de espera de captura ampliado.

## [0.1.0] — 2026-07-30

Primera versión (MVP).

### Añadido
- **Leer selección** de la terminal integrada con captura segura mediante técnica de
  centinela en el portapapeles y restauración del contenido previo.
- **Leer portapapeles** como alternativa fiable.
- **Pausar / reanudar / detener** la reproducción. Una nueva lectura cancela limpiamente la anterior.
- **Motor de voz local de Windows** (System.Speech / SAPI) en un proceso PowerShell controlado,
  con protocolo por stdin (texto en Base64 — sin inyección de comandos posible).
- **Velocidad configurable** 0.5–3.0 (≈×2 por defecto) con conversión documentada a la escala SAPI.
- **Selección de voz**: comando "Mostrar voces disponibles" y "Probar voz".
- **Dictado**: usa el comando de dictado del editor si existe; si no, ayuda con `/voice tap` de Claude Code.
- **Procesamiento de texto**: limpieza de ANSI y caracteres de control, decoraciones de terminal,
  conversión de Markdown, tratamiento de bloques de código (omitir / anunciar / leer),
  mejoras de pronunciación (rutas, URLs, camelCase, snake_case, errores TypeScript, línea/columna),
  truncado con aviso y división en fragmentos.
- **Controles en barra de estado**, paleta de comandos y menú contextual de la terminal.
- **Configuración validada** con descripciones en español e inglés.
- Compatibilidad no destructiva en macOS/Linux (aviso de motor solo-Windows).
- Suite de **pruebas unitarias** (96 pruebas) y empaquetado `.vsix` reproducible.

### Limitaciones conocidas
- Motor de voz solo Windows en esta versión.
- Sin botones en la cabecera del panel de terminal (limitación de la API pública de VS Code).
- Velocidad ×2 aproximada.
