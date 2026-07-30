/**
 * Reads the live extension configuration from VS Code and normalises it through
 * the pure `validateConfig`, so every consumer gets a guaranteed-valid object.
 */

import * as vscode from 'vscode'
import { validateConfig } from './config'
import { TerminalVoiceConfig } from './types'

export const CONFIG_SECTION = 'terminalVoice'

export function readConfig(): TerminalVoiceConfig {
  const c = vscode.workspace.getConfiguration(CONFIG_SECTION)
  return validateConfig({
    enabled: c.get('enabled'),
    language: c.get('language'),
    rate: c.get('rate'),
    volume: c.get('volume'),
    voice: c.get('voice'),
    skipCodeBlocks: c.get('skipCodeBlocks'),
    codeBlockMode: c.get('codeBlockMode'),
    maxCharacters: c.get('maxCharacters'),
    restoreClipboard: c.get('restoreClipboard'),
    showStatusBarControls: c.get('showStatusBarControls'),
    autoStopPrevious: c.get('autoStopPrevious'),
    debugLogging: c.get('debugLogging'),
  })
}
