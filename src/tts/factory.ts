/**
 * Builds the platform-appropriate TTS engine. On Windows this is the
 * System.Speech-backed PowerShell engine; elsewhere it is a no-op engine so the
 * rest of the extension keeps working (text processing, selection, etc.).
 */

import * as path from 'path'
import { PlaybackStatus } from '../types'
import { EngineLogger, TtsEngine, WindowsTtsEngine } from './engine'
import { UnsupportedTtsEngine } from './unsupported'
import { createWindowsSpawn, killTree, resolvePowerShellPath } from './windowsRuntime'

export interface TtsFactoryOptions {
  /** Absolute path to the extension's installed directory. */
  extensionPath: string
  platform: NodeJS.Platform
  onStatus?: (status: PlaybackStatus) => void
  onError?: (message: string) => void
  logger?: EngineLogger
}

export function scriptPathFor(extensionPath: string): string {
  return path.join(extensionPath, 'resources', 'speak.ps1')
}

export function createTtsEngine(opts: TtsFactoryOptions): TtsEngine {
  if (opts.platform === 'win32') {
    return new WindowsTtsEngine({
      powershellPath: resolvePowerShellPath(),
      scriptPath: scriptPathFor(opts.extensionPath),
      spawn: createWindowsSpawn(),
      killTree,
      onStatus: opts.onStatus,
      onError: opts.onError,
      logger: opts.logger,
    })
  }
  return new UnsupportedTtsEngine(opts.onStatus)
}
