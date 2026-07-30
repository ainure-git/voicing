/**
 * Truncation and chunking for safe delivery to the TTS engine.
 */

export interface TruncateResult {
  text: string
  truncated: boolean
}

export const TRUNCATION_NOTICE = ' … (texto truncado)'

/**
 * Truncates `input` to at most `maxChars`, preferring to cut at the last
 * whitespace before the limit so words are not split. Appends a spoken notice
 * when truncation occurs.
 */
export function truncate(input: string, maxChars: number): TruncateResult {
  if (maxChars <= 0 || input.length <= maxChars) {
    return { text: input, truncated: false }
  }

  let cut = input.slice(0, maxChars)
  const lastSpace = cut.lastIndexOf(' ')
  const lastNewline = cut.lastIndexOf('\n')
  const boundary = Math.max(lastSpace, lastNewline)
  if (boundary > maxChars * 0.6) {
    cut = cut.slice(0, boundary)
  }

  return { text: cut.trimEnd() + TRUNCATION_NOTICE, truncated: true }
}

/**
 * Splits `input` into chunks no longer than `maxChunkLength`, preferring to
 * break at sentence boundaries, then at any whitespace, and hard-splitting only
 * when a single run has no break point. Empty/whitespace-only chunks are
 * dropped. Guaranteed: every returned chunk has length <= maxChunkLength.
 */
export function chunkText(input: string, maxChunkLength: number): string[] {
  const limit = Math.max(1, Math.floor(maxChunkLength))
  const chunks: string[] = []
  let remaining = input.trim()

  while (remaining.length > 0) {
    if (remaining.length <= limit) {
      pushChunk(chunks, remaining)
      break
    }

    const window = remaining.slice(0, limit)
    let breakAt = lastSentenceBreak(window)
    if (breakAt <= 0) {
      breakAt = window.lastIndexOf('\n')
    }
    if (breakAt <= 0) {
      breakAt = window.lastIndexOf(' ')
    }
    if (breakAt <= 0) {
      // No natural break point: hard split at the limit.
      breakAt = limit
    } else {
      // Include the break character itself.
      breakAt += 1
    }

    pushChunk(chunks, remaining.slice(0, breakAt))
    remaining = remaining.slice(breakAt).trimStart()
  }

  return chunks
}

function pushChunk(chunks: string[], value: string): void {
  const trimmed = value.trim()
  if (trimmed.length > 0) {
    chunks.push(trimmed)
  }
}

/** Index of the last sentence-ending punctuation in `window`, or -1. */
function lastSentenceBreak(window: string): number {
  const matches = window.match(/[.!?…](?=\s|$)/g)
  if (!matches) {
    return -1
  }
  // Find the position of the last such delimiter.
  let idx = -1
  const re = /[.!?…](?=\s|$)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(window)) !== null) {
    idx = m.index
  }
  return idx
}
