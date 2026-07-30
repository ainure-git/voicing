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
import { multiplierToSapiRate } from './tts/rate'
import { TtsEngine } from './tts/engine'
import { scriptPathFor } from './tts/factory'
import { resolvePowerShellPath, listInstalledVoices, speakTest } from './tts/windowsRuntime'
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
      void vscode.window.showInformationMessage('Terminal Voice: no hay una terminal activa.')
      return
    }

    const copyCommand = await this.getCopyCommand()
    if (!copyCommand) {
      const choice = await vscode.window.showInformationMessage(
        'Terminal Voice: no encuentro el comando para copiar la selección de la terminal. Copia con Ctrl+C y usa "Leer portapapeles".',
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
      })
      captured = result.text
    } catch (err) {
      this.logger.error(`selection capture failed: ${(err as Error).message}`)
      this.updateStatus('idle')
      void vscode.window.showErrorMessage('Terminal Voice: no se pudo leer la selección.')
      return
    }

    if (!captured) {
      this.updateStatus('idle')
      void vscode.window.showInformationMessage('Terminal Voice: selecciona texto de la terminal antes de reproducirlo.')
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
      void vscode.window.showInformationMessage('Terminal Voice: el portapapeles está vacío. Copia texto con Ctrl+C.')
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
      void vscode.window.showInformationMessage('Terminal Voice: no hay ninguna lectura activa.')
    }
  }

  async stop(): Promise<void> {
    await this.engine.stop()
  }

  async testVoice(): Promise<void> {
    const config = readConfig()
    if (process.platform !== 'win32') {
      this.notifyWindowsOnly()
      return
    }
    try {
      await speakTest(
        resolvePowerShellPath(),
        scriptPathFor(this.extensionPath),
        multiplierToSapiRate(config.rate),
        config.volume,
        config.voice,
        config.language,
      )
    } catch (err) {
      this.logger.error(`test voice failed: ${(err as Error).message}`)
      void vscode.window.showErrorMessage('Terminal Voice: no se pudo reproducir la voz de prueba.')
    }
  }

  async listVoices(): Promise<void> {
    if (process.platform !== 'win32') {
      this.notifyWindowsOnly()
      return
    }
    let voices
    try {
      voices = await listInstalledVoices(resolvePowerShellPath(), scriptPathFor(this.extensionPath))
    } catch (err) {
      this.logger.error(`list voices failed: ${(err as Error).message}`)
      void vscode.window.showErrorMessage('Terminal Voice: no se pudieron enumerar las voces instaladas.')
      return
    }
    if (voices.length === 0) {
      void vscode.window.showInformationMessage('Terminal Voice: no hay voces instaladas en el sistema.')
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
        .getConfiguration('terminalVoice')
        .update('voice', picked.label, vscode.ConfigurationTarget.Global)
      void vscode.window.showInformationMessage(`Terminal Voice: voz seleccionada "${picked.label}".`)
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
        void vscode.window.showErrorMessage('Terminal Voice: el comando de dictado integrado falló.')
      }
      return
    }

    const choice = await vscode.window.showInformationMessage(
      'Terminal Voice: no hay dictado integrado disponible en esta versión. Puedes usar el dictado nativo de Claude Code con "/voice tap".',
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
        void vscode.window.showInformationMessage('Terminal Voice: abre una terminal para insertar el comando.')
      }
    } else if (choice === 'Abrir configuración') {
      await this.openSettings()
    }
  }

  async openSettings(): Promise<void> {
    await vscode.commands.executeCommand('workbench.action.openSettings', 'terminalVoice')
  }

  // --- Internals -----------------------------------------------------------

  private async speak(rawText: string, config: TerminalVoiceConfig): Promise<void> {
    if (!this.engine.supported) {
      this.notifyWindowsOnly()
      this.updateStatus('idle')
      return
    }

    const { chunks, truncated } = processText(rawText, config)
    if (chunks.length === 0) {
      this.updateStatus('idle')
      void vscode.window.showInformationMessage('Terminal Voice: no hay texto legible para reproducir.')
      return
    }
    if (truncated) {
      void vscode.window.showWarningMessage(
        `Terminal Voice: el texto superaba ${config.maxCharacters} caracteres y se truncó.`,
      )
    }

    this.logger.info(`speaking ${chunks.length} chunk(s), rate ${config.rate}x`)
    try {
      await this.engine.read({
        chunks,
        sapiRate: multiplierToSapiRate(config.rate),
        volume: config.volume,
        voice: config.voice,
        language: config.language,
      })
    } catch (err) {
      this.logger.error(`speak failed: ${(err as Error).message}`)
      this.updateStatus('error')
      void vscode.window.showErrorMessage('Terminal Voice: no se pudo iniciar la lectura.')
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
        'Terminal Voice: ya hay una lectura en curso. Deténla primero, o activa "autoStopPrevious".',
      )
      return false
    }
    return true
  }

  private notifyWindowsOnly(): void {
    void vscode.window.showInformationMessage(
      'Terminal Voice: el motor de voz de esta versión está orientado a Windows. La lectura no está disponible en este sistema.',
    )
  }
}
