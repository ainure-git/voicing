import { processText, collapseWhitespace } from '../../textProcessing'
import { validateConfig } from '../../config'
import { CODE_BLOCK_ANNOUNCE } from '../../textProcessing/codeBlocks'

const ESC = String.fromCharCode(27)

describe('collapseWhitespace', () => {
  it('collapses repeated spaces and blank lines', () => {
    expect(collapseWhitespace('a    b\n\n\n\nc   ')).toBe('a b\n\nc')
  })
})

describe('processText (integration)', () => {
  it('cleans ANSI, converts markdown and announces code blocks by default', () => {
    const config = validateConfig({})
    const raw = [
      `${ESC}[32m# Resultado${ESC}[0m`,
      'Todo **correcto** en [el informe](https://example.com/r).',
      '```ts',
      'const secreto = 42',
      '```',
      'Fin.',
    ].join('\n')

    const { text, chunks } = processText(raw, config)
    expect(text).toContain('Resultado')
    expect(text).toContain('correcto')
    expect(text).toContain('el informe')
    expect(text).not.toContain('const secreto')
    expect(text).toContain(CODE_BLOCK_ANNOUNCE)
    expect(text).not.toContain(ESC)
    expect(chunks.length).toBeGreaterThan(0)
  })

  it('reads code when skipCodeBlocks is false', () => {
    const config = validateConfig({ skipCodeBlocks: false })
    const raw = ['Texto', '```', 'linea de codigo', '```'].join('\n')
    const { text } = processText(raw, config)
    expect(text).toContain('linea de codigo')
  })

  it('truncates to maxCharacters and flags it', () => {
    const config = validateConfig({ maxCharacters: 1000 })
    const raw = 'palabra '.repeat(500)
    const { truncated, text } = processText(raw, config)
    expect(truncated).toBe(true)
    expect(text.length).toBeLessThanOrEqual(1100)
  })

  it('produces no chunks for empty/decoration-only input', () => {
    const config = validateConfig({})
    const { chunks } = processText('   \n\n  ', config)
    expect(chunks).toEqual([])
  })
})
