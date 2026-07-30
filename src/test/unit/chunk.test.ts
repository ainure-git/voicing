import { truncate, chunkText, TRUNCATION_NOTICE } from '../../textProcessing/chunk'

describe('truncate', () => {
  it('leaves short text untouched', () => {
    expect(truncate('hola', 100)).toEqual({ text: 'hola', truncated: false })
  })

  it('truncates long text and appends a notice', () => {
    const input = 'palabra '.repeat(50) // 400 chars
    const result = truncate(input, 100)
    expect(result.truncated).toBe(true)
    expect(result.text.endsWith(TRUNCATION_NOTICE)).toBe(true)
    expect(result.text.length).toBeLessThanOrEqual(100 + TRUNCATION_NOTICE.length)
  })

  it('prefers to cut at a word boundary', () => {
    const result = truncate('uno dos tres cuatro cinco seis siete', 20)
    expect(result.text).not.toContain('sie')
    expect(result.truncated).toBe(true)
  })

  it('treats maxChars <= 0 as no truncation', () => {
    expect(truncate('cualquier cosa', 0)).toEqual({ text: 'cualquier cosa', truncated: false })
  })
})

describe('chunkText', () => {
  it('returns a single chunk when under the limit', () => {
    expect(chunkText('texto corto', 100)).toEqual(['texto corto'])
  })

  it('never exceeds the chunk length', () => {
    const input = 'a'.repeat(50) + ' ' + 'b'.repeat(50) + ' ' + 'c'.repeat(50)
    const chunks = chunkText(input, 60)
    for (const c of chunks) {
      expect(c.length).toBeLessThanOrEqual(60)
    }
    expect(chunks.join('')).toContain('a'.repeat(50))
  })

  it('prefers sentence boundaries', () => {
    const input = 'Primera frase aquí. Segunda frase más larga aquí también.'
    const chunks = chunkText(input, 30)
    expect(chunks[0]).toBe('Primera frase aquí.')
  })

  it('hard-splits a single long token with no break points', () => {
    const input = 'x'.repeat(250)
    const chunks = chunkText(input, 100)
    expect(chunks.length).toBe(3)
    expect(chunks.every((c) => c.length <= 100)).toBe(true)
  })

  it('drops empty/whitespace-only chunks', () => {
    expect(chunkText('   \n\n   ', 10)).toEqual([])
  })
})
