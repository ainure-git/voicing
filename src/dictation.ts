/**
 * Discovers a real, registered dictation command instead of inventing one.
 * Given the full list of command ids (from `vscode.commands.getCommands`), it
 * ranks candidates so the most terminal-specific dictation command wins.
 */

/** The literal to offer inserting when no integrated dictation exists. */
export const CLAUDE_VOICE_HINT = '/voice tap'

/**
 * Picks the best available dictation command id, preferring terminal-specific
 * ones, then generic, then editor ones. Returns undefined when none is
 * registered.
 *
 * The match is intentionally restricted to ids that actually mention
 * "dictation"/"dictate". A broader match on "voice" is unsafe: it matches this
 * very extension's auto-generated output-channel command
 * (`workbench.action.output.show.extension-output-...Terminal Voice Controls...`)
 * and its display name, which would make "Dictar" just open the Output panel.
 */
export function pickDictationCommand(commandIds: readonly string[]): string | undefined {
  const isDictation = (id: string): boolean => {
    const lower = id.toLowerCase()
    // Never our own commands or any output-panel command.
    if (
      lower.includes('.output.') ||
      lower.includes('extension-output') ||
      lower.includes('terminalvoice') ||
      lower.includes('terminal-voice')
    ) {
      return false
    }
    return /dictation|dictate/.test(lower)
  }

  const candidates = commandIds.filter(isDictation)
  if (candidates.length === 0) {
    return undefined
  }

  const score = (id: string): number => {
    const lower = id.toLowerCase()
    if (lower.includes('terminal')) {
      return 3
    }
    if (lower.includes('editor')) {
      return 1
    }
    return 2
  }

  return [...candidates].sort((a, b) => score(b) - score(a))[0]
}
