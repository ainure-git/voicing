/**
 * Removal of ANSI escape sequences, non-printable control characters and
 * common terminal visual decorations. Pure string functions.
 */

/* eslint-disable no-control-regex */

// OSC/DCS sequences terminated by BEL or ST must be matched BEFORE the generic
// CSI pattern, otherwise CSI greedily consumes an OSC prefix and leaves the
// title text behind. Order: OSC/DCS, then CSI (ESC [ ... final byte), then
// single-char Fe escapes. Also matches the standalone C1 CSI (0x9B).
const ANSI_REGEX = new RegExp(
  [
    '\\u001B[\\]P].*?(?:\\u0007|\\u001B\\\\)',
    '[\\u001B\\u009B][[\\]()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-PR-TZcf-ntqry=><~]',
    '\\u001B[@-Z\\\\-_]',
  ].join('|'),
  'g',
)

/** Strips ANSI escape / colour / cursor sequences. */
export function stripAnsi(input: string): string {
  return input.replace(ANSI_REGEX, '')
}

// All C0 control chars except TAB (0x09) and LF (0x0A), plus DEL (0x7F) and the
// C1 range (0x80-0x9F). Built from an escaped string so the source stays pure
// ASCII with no literal control bytes.
const CONTROL_CHARS_REGEX = new RegExp(
  '[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F\\u007F-\\u009F]',
  'g',
)

/**
 * Removes non-printable C0/C1 control characters while preserving newlines and
 * tabs, and normalises CR/CRLF to LF so downstream line-based processing works.
 */
export function stripControlChars(input: string): string {
  return input.replace(/\r\n?/g, '\n').replace(CONTROL_CHARS_REGEX, '')
}

// Spinner glyphs, block/box-drawing and Powerline glyphs frequently emitted by
// progress bars and prompts. Replaced with a space so words stay separated.
const DECORATION_REGEX = new RegExp(
  [
    '[\\u2800-\\u28FF]',
    '[\\u2500-\\u257F]',
    '[\\u2580-\\u259F]',
    '[\\u25A0-\\u25FF]',
    '[\\u2190-\\u21FF]',
    '[\\uE000-\\uF8FF]',
  ].join('|'),
  'g',
)

/** Replaces common terminal decoration glyphs with spaces. */
export function stripTerminalDecorations(input: string): string {
  return input.replace(DECORATION_REGEX, ' ')
}
