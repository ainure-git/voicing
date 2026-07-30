/**
 * Binds the pure selection-capture logic to the real VS Code clipboard and
 * terminal commands, and resolves the terminal "copy selection" command id from
 * the set actually registered in the running editor (never invents an id).
 */

import * as vscode from 'vscode'
import { SelectionDeps } from './core'

/**
 * Candidate commands, most-specific first. The real id present in the running
 * editor is chosen at runtime via `getCommands`.
 */
export const COPY_COMMAND_CANDIDATES = [
  'workbench.action.terminal.copySelection',
  'workbench.action.terminal.copyAndClearSelection',
]

/** Returns the first candidate copy command that actually exists, or undefined. */
export async function resolveCopyCommand(): Promise<string | undefined> {
  const all = await vscode.commands.getCommands(true)
  const set = new Set(all)
  return COPY_COMMAND_CANDIDATES.find((id) => set.has(id))
}

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

export function createSelectionDeps(copyCommand: string): SelectionDeps {
  return {
    readClipboard: () => Promise.resolve(vscode.env.clipboard.readText()),
    writeClipboard: (text: string) => Promise.resolve(vscode.env.clipboard.writeText(text)),
    copySelection: async () => {
      await vscode.commands.executeCommand(copyCommand)
    },
    delay,
    now: () => Date.now(),
  }
}
