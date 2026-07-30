/**
 * Pronunciation improvements for terminal-flavoured tokens. Kept deliberately
 * conservative: the goal is to make paths, identifiers, URLs and error codes
 * speakable, never to deform words beyond recognition. All transforms operate
 * on plain text (Markdown and ANSI already removed).
 */

/**
 * Applies the full pronunciation pipeline. Order matters: URLs are consumed
 * first; identifier splitting (snake/camel/path) runs before the TS/file rules
 * so the injected Spanish words (e.g. "TypeScript") are not themselves split.
 */
export function improvePronunciation(input: string): string {
  let text = input

  // 1. URLs -> "enlace <host>" (consume the URL so its slashes/colons are not
  //    reprocessed by later rules).
  text = text.replace(/\bhttps?:\/\/([^\s/]+)[^\s]*/gi, (_m, host: string) => `enlace ${host}`)

  // 2. snake_case -> spaced words.
  text = text.replace(/(?<=\w)_+(?=\w)/g, ' ')

  // 3. camelCase / PascalCase -> spaced words (two passes for acronym edges).
  text = text.replace(/(?<=[a-z0-9])(?=[A-Z])/g, ' ')
  text = text.replace(/(?<=[A-Z])(?=[A-Z][a-z])/g, ' ')

  // 4. Path separators between word characters -> spaces so each segment is
  //    spoken as a word. Zero-width so runs like a/b/c are fully split.
  text = text.replace(/(?<=\w)[/\\]+(?=\w)/g, ' ')

  // 5. TypeScript error codes: TS2345 -> "error TypeScript 2345". Runs after
  //    identifier splitting so "TypeScript" survives intact.
  text = text.replace(/\bTS(\d{3,5})\b/g, 'error TypeScript $1')

  // The filename pattern is written non-overlapping (the segment class excludes
  // the dot, which only appears as an explicit separator) to avoid polynomial
  // backtracking on long dotted/word runs that lack the ":digits" suffix.
  const filename = '([\\w-]+(?:\\.[\\w-]+)*\\.[a-zA-Z]{1,6})'

  // 6. file:line:col -> "archivo <file>, línea <n>, columna <n>".
  text = text.replace(
    new RegExp(`\\b${filename}:(\\d+):(\\d+)\\b`, 'g'),
    (_m, file: string, ln: string, col: string) => `archivo ${file}, línea ${ln}, columna ${col}`,
  )

  // 7. file:line -> "archivo <file>, línea <n>".
  text = text.replace(
    new RegExp(`\\b${filename}:(\\d+)\\b`, 'g'),
    (_m, file: string, ln: string) => `archivo ${file}, línea ${ln}`,
  )

  return text
}
