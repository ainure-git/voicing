import { improvePronunciation } from '../../textProcessing/pronunciation'

describe('improvePronunciation', () => {
  it('splits camelCase and PascalCase', () => {
    expect(improvePronunciation('SpeechSynthesizer')).toBe('Speech Synthesizer')
    expect(improvePronunciation('getUserName')).toBe('get User Name')
  })

  it('splits snake_case including consecutive underscores in a word', () => {
    expect(improvePronunciation('email_reminders_enabled')).toBe('email reminders enabled')
  })

  it('speaks TypeScript error codes', () => {
    expect(improvePronunciation('found TS2345 here')).toBe('found error TypeScript 2345 here')
  })

  it('reads file:line:column references', () => {
    expect(improvePronunciation('src/app.ts:12:5')).toContain('línea 12, columna 5')
  })

  it('reads file:line references', () => {
    expect(improvePronunciation('index.js:42')).toContain('línea 42')
  })

  it('turns URLs into a spoken host', () => {
    expect(improvePronunciation('ver https://example.com/a/b?c=1')).toBe('ver enlace example.com')
  })

  it('splits path separators into words', () => {
    expect(improvePronunciation('carpeta a/b/c aquí')).toBe('carpeta a b c aquí')
  })

  it('does not mangle ordinary prose', () => {
    expect(improvePronunciation('esto es una frase normal.')).toBe('esto es una frase normal.')
  })
})
