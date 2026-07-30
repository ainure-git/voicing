/**
 * Extension entry point. Wires up the output channel, logger, playback state,
 * TTS engine, status bar and controller, then registers all commands. On
 * deactivate it disposes the engine, which kills any running voice process so
 * no orphan PowerShell/TTS process is left behind.
 */

import * as vscode from 'vscode'
import { Logger } from './logger'
import { PlaybackState } from './state'
import { StatusBarController } from './statusBar'
import { TerminalVoiceController } from './controller'
import { createTtsEngine } from './tts/factory'
import { readConfig, CONFIG_SECTION } from './configService'
import { TtsEngine } from './tts/engine'
import { PlaybackStatus } from './types'

let engineRef: TtsEngine | undefined

export function activate(context: vscode.ExtensionContext): void {
  const channel = vscode.window.createOutputChannel('Terminal Voice Controls')
  const logger = new Logger(channel, () => readConfig().debugLogging)
  const state = new PlaybackState()
  const statusBar = new StatusBarController()

  // The engine and controller reference each other: the engine reports status,
  // the controller routes it into the state machine + status bar. We break the
  // construction cycle with a mutable sink assigned once the controller exists.
  let statusSink: (status: PlaybackStatus) => void = () => {
    /* no-op until bound */
  }

  const engine = createTtsEngine({
    extensionPath: context.extensionPath,
    platform: process.platform,
    logger,
    onStatus: (status) => statusSink(status),
    onError: (message) => logger.error(`engine: ${message}`),
  })
  engineRef = engine

  const controller = new TerminalVoiceController(engine, state, statusBar, logger, context.extensionPath)
  statusSink = (status) => controller.updateStatus(status)

  const applyEnabled = (): void => {
    statusBar.setEnabled(readConfig().enabled)
  }
  applyEnabled()

  const register = (command: string, handler: () => Promise<void> | void): void => {
    context.subscriptions.push(
      vscode.commands.registerCommand(command, async () => {
        try {
          await handler()
        } catch (err) {
          logger.error(`${command} failed: ${(err as Error).message}`)
        }
      }),
    )
  }

  register('terminalVoice.readSelection', () => controller.readSelection())
  register('terminalVoice.readClipboard', () => controller.readClipboard())
  register('terminalVoice.pauseResume', () => controller.pauseResume())
  register('terminalVoice.stop', () => controller.stop())
  register('terminalVoice.testVoice', () => controller.testVoice())
  register('terminalVoice.listVoices', () => controller.listVoices())
  register('terminalVoice.dictate', () => controller.dictate())
  register('terminalVoice.openSettings', () => controller.openSettings())

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration(CONFIG_SECTION)) {
        applyEnabled()
      }
    }),
  )

  context.subscriptions.push(channel, statusBar, {
    dispose: () => {
      void engine.dispose()
    },
  })

  logger.info(`Terminal Voice Controls activated (platform: ${process.platform}, tts supported: ${engine.supported})`)
}

export function deactivate(): void {
  if (engineRef) {
    void engineRef.dispose()
    engineRef = undefined
  }
}
