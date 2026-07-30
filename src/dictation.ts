/**
 * Discovers a real, registered dictation command instead of inventing one.
 * Given the full list of command ids (from `vscode.commands.getCommands`), it
 * ranks candidates so the most terminal-specific dictation command wins.
 */

/** The literal to offer inserting when no integrated dictation exists. */
export const CLAUDE_VOICE_HINT = '/voice tap'

/**
 * Picks the best available dictation command id, preferring terminal-specific
 * ones, then editor ones, then any generic dictation command. Returns undefined
 * when none is registered.
 */
export function pickDictationCommand(commandIds: readonly string[]): string | undefined {
  const dictation = commandIds.filter((id) => /dictation|dictate|\bvoice\b/i.test(id))
  if (dictation.length === 0) {
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

  return [...dictation].sort((a, b) => score(b) - score(a))[0]
}
