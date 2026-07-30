# Privacidad

**Terminal Voice Controls es 100% local. No hay nube, no hay telemetría, no hay claves API.**

## Qué NO hace
- **No hay telemetría.** La extensión no recopila ni envía métricas, uso, errores ni identificadores.
- **El texto leído no se envía a ningún servidor.** La síntesis de voz ocurre en tu ordenador con el
  motor local de Windows (System.Speech / SAPI).
- **No se almacenan las respuestas leídas.** El texto se procesa en memoria y se descarta.
- **No se registra el contenido leído en logs.** El canal de diagnóstico solo guarda eventos de
  ciclo de vida (estados, errores técnicos), nunca el texto que reproduces.
- **No usa servicios de voz en la nube** ni descarga modelos.

## Qué hace (y por qué es seguro)
- **Portapapeles (temporal).** Para leer la selección de la terminal, la extensión escribe un
  marcador temporal en el portapapeles, ejecuta el comando de copia del editor, lee el resultado y,
  si `restoreClipboard` está activo, **restaura tu portapapeles anterior**. El contenido nunca sale
  de tu equipo.
- **Proceso de voz local.** El texto se pasa al proceso de PowerShell **codificado en Base64 por
  stdin**, nunca en la línea de comandos, lo que evita cualquier inyección y evita que el texto
  aparezca en la lista de procesos.
- **Sin red.** La extensión no abre conexiones de red.

## Datos de configuración
Tus ajustes (`terminalVoice.*`, p. ej. la voz elegida) se guardan en la configuración local de
tu editor, como cualquier otra extensión. No se sincronizan salvo que tú actives la sincronización
de ajustes de tu editor.

## Permisos
La extensión solo usa APIs públicas del editor (portapapeles, comandos, terminal activa, barra de
estado) y, en Windows, un proceso local de PowerShell para la síntesis de voz.
