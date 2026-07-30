import { validateConfig, effectiveCodeBlockMode, DEFAULT_CONFIG } from '../../config'

describe('validateConfig', () => {
  it('returns defaults for an empty object', () => {
    expect(validateConfig({})).toEqual(DEFAULT_CONFIG)
  })

  it('clamps rate into 0.5–3.0', () => {
    expect(validateConfig({ rate: 99 }).rate).toBe(3.0)
    expect(validateConfig({ rate: 0.01 }).rate).toBe(0.5)
    expect(validateConfig({ rate: 1.25 }).rate).toBe(1.25)
  })

  it('clamps and rounds volume into 0–100', () => {
    expect(validateConfig({ volume: 250 }).volume).toBe(100)
    expect(validateConfig({ volume: -5 }).volume).toBe(0)
    expect(validateConfig({ volume: 55.6 }).volume).toBe(56)
  })

  it('clamps maxCharacters into range', () => {
    expect(validateConfig({ maxCharacters: 10 }).maxCharacters).toBe(1000)
    expect(validateConfig({ maxCharacters: 9_000_000 }).maxCharacters).toBe(200000)
  })

  it('falls back for invalid codeBlockMode', () => {
    expect(validateConfig({ codeBlockMode: 'nope' }).codeBlockMode).toBe('announce')
    expect(validateConfig({ codeBlockMode: 'read' }).codeBlockMode).toBe('read')
  })

  it('substitutes defaults for wrong types', () => {
    const cfg = validateConfig({ enabled: 'yes', rate: 'fast', voice: 123 })
    expect(cfg.enabled).toBe(true)
    expect(cfg.rate).toBe(DEFAULT_CONFIG.rate)
    expect(cfg.voice).toBe('')
  })

  it('ignores non-finite numbers', () => {
    expect(validateConfig({ rate: Number.NaN }).rate).toBe(DEFAULT_CONFIG.rate)
    expect(validateConfig({ volume: Number.POSITIVE_INFINITY }).volume).toBe(DEFAULT_CONFIG.volume)
  })
})

describe('effectiveCodeBlockMode', () => {
  it('forces "read" when skipCodeBlocks is false', () => {
    const cfg = validateConfig({ skipCodeBlocks: false, codeBlockMode: 'skip' })
    expect(effectiveCodeBlockMode(cfg)).toBe('read')
  })

  it('uses codeBlockMode when skipCodeBlocks is true', () => {
    const cfg = validateConfig({ skipCodeBlocks: true, codeBlockMode: 'skip' })
    expect(effectiveCodeBlockMode(cfg)).toBe('skip')
  })
})
