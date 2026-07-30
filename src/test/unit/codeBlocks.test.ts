import { handleCodeBlocks, CODE_BLOCK_ANNOUNCE } from '../../textProcessing/codeBlocks'

const fenced = ['Antes', '```ts', 'const x = 1', 'console.log(x)', '```', 'Después'].join('\n')

describe('handleCodeBlocks', () => {
  it('announces code blocks in "announce" mode', () => {
    const out = handleCodeBlocks(fenced, 'announce')
    expect(out).toContain(CODE_BLOCK_ANNOUNCE)
    expect(out).not.toContain('const x = 1')
    expect(out).toContain('Antes')
    expect(out).toContain('Después')
  })

  it('removes code blocks entirely in "skip" mode', () => {
    const out = handleCodeBlocks(fenced, 'skip')
    expect(out).not.toContain('const x = 1')
    expect(out).not.toContain(CODE_BLOCK_ANNOUNCE)
    expect(out).toContain('Antes')
    expect(out).toContain('Después')
  })

  it('keeps the code but drops the fences in "read" mode', () => {
    const out = handleCodeBlocks(fenced, 'read')
    expect(out).toContain('const x = 1')
    expect(out).not.toContain('```')
  })

  it('handles tilde fences', () => {
    const t = ['~~~', 'code here', '~~~'].join('\n')
    expect(handleCodeBlocks(t, 'skip').trim()).toBe('')
  })

  it('handles an unterminated fence to end of input', () => {
    const unterminated = ['texto', '```js', 'a()', 'b()'].join('\n')
    const out = handleCodeBlocks(unterminated, 'announce')
    expect(out).toContain('texto')
    expect(out).toContain(CODE_BLOCK_ANNOUNCE)
    expect(out).not.toContain('a()')
  })

  it('leaves text without fences untouched', () => {
    expect(handleCodeBlocks('solo texto normal', 'announce')).toBe('solo texto normal')
  })
})
