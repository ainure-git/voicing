/**
 * Shared types for Terminal Voice Controls.
 * This module has no runtime dependency on the `vscode` API so it can be
 * imported freely by pure-logic units and unit tests.
 */

export type CodeBlockMode = 'skip' | 'announce' | 'read'

export interface TerminalVoiceConfig {
  enabled: boolean
  /** BCP-47 language tag used to pick a default voice, e.g. "es-ES". */
  language: string
  /** Speed multiplier in the range 0.5–3.0 (2.0 ≈ double speed). */
  rate: number
  /** Volume 0–100. */
  volume: number
  /** Exact installed voice name, or "" for the default. */
  voice: string
  skipCodeBlocks: boolean
  codeBlockMode: CodeBlockMode
  maxCharacters: number
  restoreClipboard: boolean
  showStatusBarControls: boolean
  autoStopPrevious: boolean
  debugLogging: boolean
}

/**
 * Playback lifecycle states. Mirrors the discreet status shown to the user:
 * Preparando / Reproduciendo / Pausado / Detenido / Error, plus the resting
 * Idle state.
 */
export type PlaybackStatus =
  | 'idle'
  | 'preparing'
  | 'playing'
  | 'paused'
  | 'stopped'
  | 'error'
