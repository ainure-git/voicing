/**
 * Safe serialisation of arbitrary text for hand-off to the PowerShell TTS
 * process. Text is NEVER interpolated into a command string; it is Base64
 * (UTF-8) encoded and sent over stdin, where the PowerShell script decodes it
 * back to a plain .NET string and passes it to SpeakAsync. This makes shell /
 * command injection structurally impossible: the encoded payload contains only
 * [A-Za-z0-9+/=], so no shell metacharacter can survive the round-trip.
 */

/** Base64-encodes UTF-8 text. Output is guaranteed injection-safe. */
export function toBase64Utf8(text: string): string {
  return Buffer.from(text, 'utf8').toString('base64')
}

/** True if `s` is a pure Base64 string (defensive assertion for tests/guards). */
export function isPureBase64(s: string): boolean {
  return /^[A-Za-z0-9+/]*={0,2}$/.test(s)
}
