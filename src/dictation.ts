/**
 * Discovers a real, registered dictation command instead of inventing one.
 * Given the full list of command ids (from `vscode.commands.getCommands`), it
 * ranks candidates so the most terminal-specific dictation command wins.
 */

/** The literal to offer inserting when no integrated dictation exists. */
export const CLAUDE_VOICE_HINT = '/voice tap'

/**
 * Picks a **terminal-scoped** dictation command, or undefined when none exists.
 *
 * We deliberately only accept dictation commands that target the terminal. A
 * generic editor/chat dictation command (e.g. Cursor's voice chat) types into
 * the editor/chat — not the terminal — and is useless for dictating a terminal
 * command; worse, it may be locked to English. When there is no terminal-native
 * dictation, the caller falls back to Claude Code's `/voice tap`, which is the
 * intended path for terminal dictation.
 *
 * The match also excludes this extension's own commands and the auto-generated
 * output-channel command (whose id contains "Terminal Voice").
 */
export function pickDictationCommand(commandIds: readonly string[]): string | undefined {
  const isTerminalDictation = (id: string): boolean => {
    const lower = id.toLowerCase()
    if (
      lower.includes('.output.') ||
      lower.includes('extension-output') ||
      lower.includes('terminalvoice') ||
      lower.includes('terminal-voice')
    ) {
      return false
    }
    return lower.includes('terminal') && /dictation|dictate/.test(lower)
  }

  return commandIds.find(isTerminalDictation)
}
