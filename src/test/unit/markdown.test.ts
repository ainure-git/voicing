import { markdownToText } from '../../textProcessing/markdown'

describe('markdownToText', () => {
  it('drops heading hashes but keeps the text', () => {
    expect(markdownToText('# Título principal')).toBe('Título principal')
    expect(markdownToText('### Sub sección ###')).toBe('Sub sección')
  })

  it('unwraps bold and italic', () => {
    expect(markdownToText('esto es **muy** importante')).toBe('esto es muy importante')
    expect(markdownToText('esto es _cursiva_ aquí')).toBe('esto es cursiva aquí')
    expect(markdownToText('mezcla __negrita__ y *itálica*')).toBe('mezcla negrita y itálica')
  })

  it('keeps link text and drops the URL', () => {
    expect(markdownToText('mira [la documentación](https://example.com/docs) ahora')).toBe(
      'mira la documentación ahora',
    )
  })

  it('keeps image alt text', () => {
    expect(markdownToText('![diagrama](https://x/y.png)')).toBe('diagrama')
  })

  it('removes list markers but keeps items', () => {
    expect(markdownToText('- uno\n- dos\n- tres')).toBe('uno\ndos\ntres')
    expect(markdownToText('1. primero\n2. segundo')).toBe('primero\nsegundo')
  })

  it('removes blockquote markers', () => {
    expect(markdownToText('> una cita')).toBe('una cita')
  })

  it('turns horizontal rules into blank lines', () => {
    expect(markdownToText('a\n---\nb')).toBe('a\n\nb')
  })

  it('unwraps inline code', () => {
    expect(markdownToText('ejecuta `pnpm build` ahora')).toBe('ejecuta pnpm build ahora')
  })

  it('drops table separator rows and pipes', () => {
    const table = '| A | B |\n| --- | --- |\n| 1 | 2 |'
    const out = markdownToText(table)
    expect(out).not.toContain('|')
    expect(out).not.toContain('---')
    expect(out).toContain('A')
    expect(out).toContain('1')
  })
})
