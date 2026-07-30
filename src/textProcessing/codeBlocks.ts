/**
 * Fenced code-block detection and handling. Runs before Markdown conversion so
 * the ``` / ~~~ fences are still intact.
 */

import { CodeBlockMode } from '../types'

export const CODE_BLOCK_ANNOUNCE = 'Bloque de código omitido.'

const FENCE_REGEX = /^(\s*)(`{3,}|~{3,})(.*)$/

/**
 * Processes fenced code blocks according to `mode`:
 *  - "skip":     remove the block entirely.
 *  - "announce": replace the block with a short spoken notice.
 *  - "read":     keep the code, dropping only the fence lines.
 *
 * Handles unterminated fences (treated as running to end of input) and both
 * backtick and tilde fences.
 */
export function handleCodeBlocks(input: string, mode: CodeBlockMode): string {
  const lines = input.split('\n')
  const out: string[] = []

  let inBlock = false
  let fenceChar = ''
  let fenceLen = 0
  let blockLines: string[] = []

  const flush = (): void => {
    if (mode === 'announce') {
      out.push(CODE_BLOCK_ANNOUNCE)
    } else if (mode === 'read') {
      out.push(...blockLines)
    }
    // "skip": emit nothing.
    blockLines = []
  }

  for (const line of lines) {
    const match = FENCE_REGEX.exec(line)

    if (!inBlock) {
      if (match) {
        inBlock = true
        fenceChar = match[2][0]
        fenceLen = match[2].length
      } else {
        out.push(line)
      }
      continue
    }

    // Inside a block: a closing fence uses the same char and >= length,
    // with no trailing info string.
    const isClose =
      match !== null &&
      match[2][0] === fenceChar &&
      match[2].length >= fenceLen &&
      match[3].trim() === ''

    if (isClose) {
      flush()
      inBlock = false
      fenceChar = ''
      fenceLen = 0
    } else {
      blockLines.push(line)
    }
  }

  // Unterminated fence: flush whatever was collected.
  if (inBlock) {
    flush()
  }

  return out.join('\n')
}
