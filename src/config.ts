/**
 * Configuration defaults, validation and clamping.
 * Pure logic — no `vscode` import — so it is unit-testable in isolation.
 * The live reading from `workspace.getConfiguration` lives in configService.ts.
 */

import { CodeBlockMode, TerminalVoiceConfig } from './types'

export const DEFAULT_CONFIG: TerminalVoiceConfig = {
  enabled: true,
  language: 'es-ES',
  rate: 2.0,
  volume: 100,
  voice: '',
  skipCodeBlocks: true,
  codeBlockMode: 'announce',
  maxCharacters: 30000,
  restoreClipboard: true,
  showStatusBarControls: true,
  autoStopPrevious: true,
  debugLogging: false,
}

export const RATE_MIN = 0.5
export const RATE_MAX = 3.0
export const VOLUME_MIN = 0
export const VOLUME_MAX = 100
export const MAX_CHARS_MIN = 1000
export const MAX_CHARS_MAX = 200000

const CODE_BLOCK_MODES: readonly CodeBlockMode[] = ['skip', 'announce', 'read']

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) {
    return fallback
  }
  return Math.min(max, Math.max(min, n))
}

function asBool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function asString(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback
}

function asCodeBlockMode(value: unknown, fallback: CodeBlockMode): CodeBlockMode {
  return typeof value === 'string' && (CODE_BLOCK_MODES as readonly string[]).includes(value)
    ? (value as CodeBlockMode)
    : fallback
}

/**
 * Normalises an arbitrary settings object into a fully-valid config, clamping
 * out-of-range values and substituting defaults for anything malformed.
 */
export function validateConfig(raw: Partial<Record<keyof TerminalVoiceConfig, unknown>> = {}): TerminalVoiceConfig {
  return {
    enabled: asBool(raw.enabled, DEFAULT_CONFIG.enabled),
    language: asString(raw.language, DEFAULT_CONFIG.language).trim() || DEFAULT_CONFIG.language,
    rate: clampNumber(raw.rate, RATE_MIN, RATE_MAX, DEFAULT_CONFIG.rate),
    volume: Math.round(clampNumber(raw.volume, VOLUME_MIN, VOLUME_MAX, DEFAULT_CONFIG.volume)),
    voice: asString(raw.voice, DEFAULT_CONFIG.voice),
    skipCodeBlocks: asBool(raw.skipCodeBlocks, DEFAULT_CONFIG.skipCodeBlocks),
    codeBlockMode: asCodeBlockMode(raw.codeBlockMode, DEFAULT_CONFIG.codeBlockMode),
    maxCharacters: Math.round(
      clampNumber(raw.maxCharacters, MAX_CHARS_MIN, MAX_CHARS_MAX, DEFAULT_CONFIG.maxCharacters),
    ),
    restoreClipboard: asBool(raw.restoreClipboard, DEFAULT_CONFIG.restoreClipboard),
    showStatusBarControls: asBool(raw.showStatusBarControls, DEFAULT_CONFIG.showStatusBarControls),
    autoStopPrevious: asBool(raw.autoStopPrevious, DEFAULT_CONFIG.autoStopPrevious),
    debugLogging: asBool(raw.debugLogging, DEFAULT_CONFIG.debugLogging),
  }
}

/**
 * Resolves the effective code-block handling. `skipCodeBlocks === false` is a
 * simple override meaning "read everything"; otherwise `codeBlockMode` decides.
 */
export function effectiveCodeBlockMode(config: TerminalVoiceConfig): CodeBlockMode {
  if (config.skipCodeBlocks === false) {
    return 'read'
  }
  return config.codeBlockMode
}
