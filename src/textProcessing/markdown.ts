/**
 * Lightweight Markdown -> natural text conversion. Not a full parser: it
 * targets the constructs that commonly appear in assistant/terminal output and
 * turns them into something a screen reader speaks naturally, without deforming
 * the underlying words.
 */

/** Converts basic Markdown to plain, speakable text. */
export function markdownToText(input: string): string {
  const lines = input.split('\n')
  const out: string[] = []

  for (const rawLine of lines) {
    let line = rawLine

    // Table separator rows like |---|:--:|  -> drop entirely. Require a pipe so
    // a bare "---" is treated as a horizontal rule (handled just below) rather
    // than a table separator.
    if (line.includes('|') && /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(line)) {
      continue
    }

    // Horizontal rules --- *** ___  -> sentence break (blank line).
    if (/^\s*([-*_])\1{2,}\s*$/.test(line)) {
      out.push('')
      continue
    }

    // Headings: drop the leading #'s (and trailing #'s), keep the text.
    line = line.replace(/^\s*#{1,6}\s+/, '').replace(/\s+#+\s*$/, '')

    // Blockquote markers.
    line = line.replace(/^\s*>\s?/, '')

    // Unordered list markers -> keep the item text.
    line = line.replace(/^(\s*)[-*+]\s+/, '$1')

    // Ordered list markers "1." / "1)" -> keep the item text.
    line = line.replace(/^(\s*)\d+[.)]\s+/, '$1')

    // Table cell pipes -> spaces.
    if (line.includes('|')) {
      line = line.replace(/\s*\|\s*/g, ' ').trim()
    }

    out.push(line)
  }

  let text = out.join('\n')

  // Images: ![alt](url) -> alt  (must run before links).
  text = text.replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')

  // Links: [text](url) -> text.
  text = text.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')

  // Bold: **text** or __text__ -> text.
  text = text.replace(/(\*\*|__)(.+?)\1/g, '$2')

  // Italic: *text* or _text_ -> text.
  text = text.replace(/(^|[^\w*])[*_]([^*_\n]+)[*_](?=[^\w*]|$)/g, '$1$2')

  // Strikethrough: ~~text~~ -> text.
  text = text.replace(/~~(.+?)~~/g, '$1')

  // Inline code: `code` -> code (fenced blocks were handled earlier).
  text = text.replace(/`([^`]+)`/g, '$1')

  return text
}
