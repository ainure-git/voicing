/**
 * Orchestrates the extension: wires configuration, the TTS engine, the state
 * machine and the status bar, and implements every command handler. This is the
 * single place that decides *what happens* when the user triggers an action.
 */

import * as vscode from 'vscode'
import { PlaybackState } from './state'
import { StatusBarController } from './statusBar'
import { Logger } from './logger'
import { readConfig } from './configService'
import { TerminalVoiceConfig, PlaybackStatus } from './types'
import { processText } from './textProcessing'
import { TtsEngine } from './tts/engine'
import { scriptPathFor } from './tts/factory'
import { InstalledVoice, resolvePowerShellPath, listInstalledVoices, speakTest } from './tts/windowsRuntime'
import { detectPosixTool, posixListVoices, posixSpeakTest } from './tts/posixRuntime'
import { captureTerminalSelection } from './selection/core'
import { createSelectionDeps, resolveCopyCommand } from './selection/vscode'
import { pickDictationCommand, CLAUDE_VOICE_HINT } from './dictation'

export class TerminalVoiceController {
  private copyCommand: string | undefined
  private copyCommandResolved = false

  constructor(
    private readonly engine: TtsEngine,
    private readonly state: PlaybackState,
    private readonly statusBar: StatusBarController,
    private readonly logger: Logger,
    private readonly extensionPath: string,
  ) {}

  /** Central status sink shared by the engine callback and manual updates. */
  updateStatus(status: PlaybackStatus): void {
    this.state.transition(status)
    this.statusBar.setStatus(this.state.current)
    this.logger.debug(`status -> ${this.state.current}`)
  }

  // --- Commands ------------------------------------------------------------

  async readSelection(): Promise<void> {
    const config = readConfig()
    if (!config.enabled) {
      return
    }
    if (!this.ensureCanStart(config)) {
      return
    }
    if (!vscode.window.activeTerminal) {
      void vscode.window.showInformationMessage('Voicing: no hay una terminal activa.')
      return
    }

    const copyCommand = await this.getCopyCommand()
    if (!copyCommand) {
      const choice = await vscode.window.showInformationMessage(
        'Voicing: no encuentro el comando para copiar la selección de la terminal. Copia con Ctrl+C y usa "Leer portapapeles".',
        'Leer portapapeles',
      )
      if (choice === 'Leer portapapeles') {
        await this.readClipboard()
      }
      return
    }

    this.updateStatus('preparing')
    let captured: string | null
    try {
      const result = await captureTerminalSelection(createSelectionDeps(copyCommand), {
        restoreClipboard: config.restoreClipboard,
        timeoutMs: 2500,
      })
      captured = result.text
    } catch (err) {
      this.logger.error(`selection capture failed: ${(err as Error).message}`)
      this.updateStatus('idle')
      void vscode.window.showErrorMessage('Voicing: no se pudo leer la selección.')
      return
    }

    // Diagnostics only ever record the length, never the content.
    this.logger.debug(`selection capture via "${copyCommand}": ${captured ? `${captured.length} chars` : 'none'}`)

    if (!captured) {
      this.updateStatus('idle')
      const choice = await vscode.window.showInformationMessage(
        'Voicing: no detecté selección en la terminal. Si seleccionaste texto, cópialo con Ctrl+C y pulsa "Leer portapapeles".',
        'Leer portapapeles',
      )
      if (choice === 'Leer portapapeles') {
        await this.readClipboard()
      }
      return
    }

    await this.speak(captured, config)
  }

  async readClipboard(): Promise<void> {
    const config = readConfig()
    if (!config.enabled) {
      return
    }
    if (!this.ensureCanStart(config)) {
      return
    }
    const text = await vscode.env.clipboard.readText()
    if (!text || text.trim().length === 0) {
      void vscode.window.showInformationMessage('Voicing: el portapapeles está vacío. Copia texto con Ctrl+C.')
      return
    }
    await this.speak(text, config)
  }

  async pauseResume(): Promise<void> {
    if (this.state.current === 'playing') {
      this.engine.pause()
    } else if (this.state.current === 'paused') {
      this.engine.resume()
    } else {
      void vscode.window.showInformationMessage('Voicing: no hay ninguna lectura activa.')
    }
  }

  async stop(): Promise<void> {
    await this.engine.stop()
  }

  async testVoice(): Promise<void> {
    const config = readConfig()
    try {
      if (process.platform === 'win32') {
        await speakTest(
          resolvePowerShellPath(),
          scriptPathFor(this.extensionPath),
          config.rate,
          config.volume,
          config.voice,
          config.language,
        )
        return
      }
      const spec = detectPosixTool(process.platform)
      if (!spec) {
        this.notifyUnsupported()
        return
      }
      await posixSpeakTest(spec, config.rate, config.volume, config.voice, config.language)
    } catch (err) {
      this.logger.error(`test voice failed: ${(err as Error).message}`)
      void vscode.window.showErrorMessage('Voicing: no se pudo reproducir la voz de prueba.')
    }
  }

  async listVoices(): Promise<void> {
    let voices: InstalledVoice[]
    try {
      if (process.platform === 'win32') {
        voices = await listInstalledVoices(resolvePowerShellPath(), scriptPathFor(this.extensionPath))
      } else {
        const spec = detectPosixTool(process.platform)
        if (!spec) {
          this.notifyUnsupported()
          return
        }
        voices = posixListVoices(spec)
      }
    } catch (err) {
      this.logger.error(`list voices failed: ${(err as Error).message}`)
      void vscode.window.showErrorMessage('Voicing: no se pudieron enumerar las voces instaladas.')
      return
    }
    if (voices.length === 0) {
      void vscode.window.showInformationMessage('Voicing: no hay voces instaladas (o no se pudieron enumerar).')
      return
    }

    const picked = await vscode.window.showQuickPick(
      voices.map((v) => ({
        label: v.name,
        description: `${v.culture} · ${v.gender}`,
      })),
      { placeHolder: 'Selecciona la voz a usar (se guardará en la configuración)' },
    )
    if (picked) {
      await vscode.workspace
        .getConfiguration('voicing')
        .update('voice', picked.label, vscode.ConfigurationTarget.Global)
      void vscode.window.showInformationMessage(`Voicing: voz seleccionada "${picked.label}".`)
    }
  }

  async dictate(): Promise<void> {
    const all = await vscode.commands.getCommands(true)
    const command = pickDictationCommand(all)
    if (command) {
      this.logger.info(`dictation via "${command}"`)
      try {
        await vscode.commands.executeCommand(command)
      } catch (err) {
        this.logger.error(`dictation command failed: ${(err as Error).message}`)
        void vscode.window.showErrorMessage('Voicing: el comando de dictado integrado falló.')
      }
      return
    }

    const choice = await vscode.window.showInformationMessage(
      'Voicing: no hay dictado integrado disponible en esta versión. Puedes usar el dictado nativo de Claude Code con "/voice tap".',
      'Insertar "/voice tap"',
      'Abrir configuración',
    )
    if (choice === 'Insertar "/voice tap"') {
      const terminal = vscode.window.activeTerminal
      if (terminal) {
        terminal.show(true)
        // Insert without a trailing newline: the user decides when to send it.
        terminal.sendText(CLAUDE_VOICE_HINT, false)
      } else {
        void vscode.window.showInformationMessage('Voicing: abre una terminal para insertar el comando.')
      }
    } else if (choice === 'Abrir configuración') {
      await this.openSettings()
    }
  }

  async openSettings(): Promise<void> {
    await vscode.commands.executeCommand('workbench.action.openSettings', 'voicing')
  }

  // --- Internals -----------------------------------------------------------

  private async speak(rawText: string, config: TerminalVoiceConfig): Promise<void> {
    if (!this.engine.supported) {
      this.notifyUnsupported()
      this.updateStatus('idle')
      return
    }

    const { chunks, truncated } = processText(rawText, config)
    if (chunks.length === 0) {
      this.updateStatus('idle')
      void vscode.window.showInformationMessage('Voicing: no hay texto legible para reproducir.')
      return
    }
    if (truncated) {
      void vscode.window.showWarningMessage(
        `Voicing: el texto superaba ${config.maxCharacters} caracteres y se truncó.`,
      )
    }

    this.logger.info(`speaking ${chunks.length} chunk(s), rate ${config.rate}x`)
    try {
      await this.engine.read({
        chunks,
        rate: config.rate,
        volume: config.volume,
        voice: config.voice,
        language: config.language,
      })
    } catch (err) {
      this.logger.error(`speak failed: ${(err as Error).message}`)
      this.updateStatus('error')
      void vscode.window.showErrorMessage('Voicing: no se pudo iniciar la lectura.')
    }
  }

  private async getCopyCommand(): Promise<string | undefined> {
    if (!this.copyCommandResolved) {
      this.copyCommand = await resolveCopyCommand()
      this.copyCommandResolved = true
      this.logger.debug(`copy command resolved: ${this.copyCommand ?? 'none'}`)
    }
    return this.copyCommand
  }

  /**
   * Enforces `autoStopPrevious`. When it is disabled and a reading is already
   * active, a new read is refused (rather than silently interrupting), which is
   * the only way to honour the setting with a single voice process.
   */
  private ensureCanStart(config: TerminalVoiceConfig): boolean {
    if (!config.autoStopPrevious && this.state.isActive) {
      void vscode.window.showInformationMessage(
        'Voicing: ya hay una lectura en curso. Deténla primero, o activa "autoStopPrevious".',
      )
      return false
    }
    return true
  }

  private notifyUnsupported(): void {
    const hint =
      process.platform === 'linux'
        ? ' Instala "espeak-ng" (o "speech-dispatcher") y recarga.'
        : ''
    void vscode.window.showInformationMessage(
      `Voicing: no se encontró un motor de voz local en este sistema.${hint}`,
    )
  }
}
