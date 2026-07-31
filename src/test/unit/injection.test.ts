import { toBase64Utf8, isPureBase64 } from '../../tts/encoding'
import { buildControllerArgs, buildTestArgs } from '../../tts/engine'

describe('PowerShell injection protection', () => {
  const malicious = [
    '"; Remove-Item -Recurse -Force C:\\ ; "',
    '$(Invoke-Expression "calc.exe")',
    '`n Stop-Computer `n',
    "'; DROP TABLE users; --",
    'text with | pipe && chained ; semicolons > redirects',
    'multi\nline\r\ntext\twith\ttabs',
  ]

  it('encodes arbitrary text to pure Base64 with no shell metacharacters', () => {
    for (const payload of malicious) {
      const encoded = toBase64Utf8(payload)
      expect(isPureBase64(encoded)).toBe(true)
      expect(encoded).not.toMatch(/[;&|`$'"<>]/)
      expect(encoded).not.toContain('\n')
      // Round-trips losslessly.
      expect(Buffer.from(encoded, 'base64').toString('utf8')).toBe(payload)
    }
  })

  it('never places raw text on the controller command line', () => {
    const req = { chunks: ['irrelevant'], rate: 6, volume: 100, voice: 'Any Voice' }
    const args = buildControllerArgs('C:\\ext\\speak.ps1', req)
    // Text is delivered over stdin, so no chunk text appears in argv.
    expect(args.join(' ')).not.toContain('irrelevant')
  })

  it('clamps numeric args and keeps them numeric', () => {
    const args = buildControllerArgs('s.ps1', { chunks: ['x'], rate: 999, volume: -50, voice: '' })
    const rate = args[args.indexOf('-Rate') + 1]
    const volume = args[args.indexOf('-Volume') + 1]
    expect(rate).toBe('10')
    expect(volume).toBe('0')
    expect(Number.isNaN(Number(rate))).toBe(false)
  })

  it('passes the voice as its own argv element (safe under shell:false spawn)', () => {
    const args = buildTestArgs('s.ps1', 0, 100, 'Microsoft Helena Desktop')
    const idx = args.indexOf('-Voice')
    expect(args[idx + 1]).toBe('Microsoft Helena Desktop')
  })

  it('passes the language as a bound argv element', () => {
    const controllerArgs = buildControllerArgs('s.ps1', {
      chunks: ['x'],
      rate: 6,
      volume: 100,
      voice: '',
      language: 'es-ES',
    })
    const idx = controllerArgs.indexOf('-Language')
    expect(controllerArgs[idx + 1]).toBe('es-ES')
  })
})
