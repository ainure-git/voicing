import { stripAnsi, stripControlChars, stripTerminalDecorations } from '../../textProcessing/ansi'

const ESC = String.fromCharCode(27)
const BEL = String.fromCharCode(7)
const NUL = String.fromCharCode(0)
const DEL = String.fromCharCode(127)
const C1 = String.fromCharCode(0x9b)
const TAB = String.fromCharCode(9)

describe('stripAnsi', () => {
  it('removes SGR colour codes', () => {
    expect(stripAnsi(`${ESC}[31mrojo${ESC}[0m`)).toBe('rojo')
  })

  it('removes cursor movement and clear-line sequences', () => {
    expect(stripAnsi(`hola${ESC}[2K${ESC}[1Gmundo`)).toBe('holamundo')
  })

  it('removes OSC title sequences terminated by BEL', () => {
    expect(stripAnsi(`${ESC}]0;mi titulo${BEL}texto`)).toBe('texto')
  })

  it('leaves plain text untouched', () => {
    expect(stripAnsi('sin secuencias')).toBe('sin secuencias')
  })
})

describe('stripControlChars', () => {
  it('normalises CRLF and CR to LF', () => {
    expect(stripControlChars('a\r\nb\rc')).toBe('a\nb\nc')
  })

  it('removes NUL and BEL but keeps tab and newline', () => {
    expect(stripControlChars(`a${NUL}b${BEL}c${TAB}d\ne`)).toBe(`abc${TAB}d\ne`)
  })

  it('removes DEL and C1 controls', () => {
    expect(stripControlChars(`x${DEL}y${C1}z`)).toBe('xyz')
  })
})

describe('stripTerminalDecorations', () => {
  it('replaces spinner braille glyphs with spaces', () => {
    expect(stripTerminalDecorations('⠋ cargando').trim()).toBe('cargando')
  })

  it('replaces box-drawing characters with spaces', () => {
    const boxed = stripTerminalDecorations('── titulo ──')
    expect(boxed).not.toMatch(/[─-╿]/)
    expect(boxed).toContain('titulo')
  })
})
