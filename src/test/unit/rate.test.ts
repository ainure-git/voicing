import { multiplierToSapiRate, SAPI_MIN, SAPI_MAX } from '../../tts/rate'

describe('multiplierToSapiRate', () => {
  it('maps normal speed (1.0x) to SAPI 0', () => {
    expect(multiplierToSapiRate(1.0)).toBe(0)
  })

  it('maps the x2 default to SAPI 6 (approximate doubling)', () => {
    expect(multiplierToSapiRate(2.0)).toBe(6)
  })

  it('maps 3.0x to the SAPI maximum', () => {
    expect(multiplierToSapiRate(3.0)).toBe(SAPI_MAX)
  })

  it('maps 0.5x to SAPI -6', () => {
    expect(multiplierToSapiRate(0.5)).toBe(-6)
  })

  it('clamps out-of-range multipliers', () => {
    expect(multiplierToSapiRate(10)).toBeLessThanOrEqual(SAPI_MAX)
    expect(multiplierToSapiRate(0.01)).toBeGreaterThanOrEqual(SAPI_MIN)
  })

  it('falls back to 0 for non-finite input', () => {
    expect(multiplierToSapiRate(Number.NaN)).toBe(0)
  })

  it('is monotonic increasing across the range', () => {
    const points = [0.5, 0.75, 1.0, 1.5, 2.0, 2.5, 3.0]
    const rates = points.map(multiplierToSapiRate)
    for (let i = 1; i < rates.length; i++) {
      expect(rates[i]).toBeGreaterThanOrEqual(rates[i - 1])
    }
  })
})
