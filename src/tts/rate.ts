/**
 * Speed conversion between the user-facing multiplier (0.5–3.0) and the SAPI /
 * System.Speech rate scale (-10..10).
 *
 * SAPI's rate is roughly exponential: each +10 step is about 3x faster and each
 * -10 step about 1/3 the speed (per Microsoft's documentation). We therefore
 * map a multiplier m to:
 *
 *     sapiRate = round( 10 * ln(m) / ln(3) )   clamped to [-10, 10]
 *
 * Reference points: 1.0x -> 0, 2.0x -> 6, 3.0x -> 10, 0.5x -> -6.
 * The x2 default therefore lands at SAPI rate 6, which is an approximate — not
 * exact — doubling. This conversion is documented in TECHNICAL_DECISIONS.md.
 */

export const MULTIPLIER_MIN = 0.5
export const MULTIPLIER_MAX = 3.0
export const SAPI_MIN = -10
export const SAPI_MAX = 10

/** Converts a 0.5–3.0 speed multiplier to a SAPI rate in [-10, 10]. */
export function multiplierToSapiRate(multiplier: number): number {
  const safe = Number.isFinite(multiplier) ? multiplier : 1.0
  const clampedMultiplier = Math.min(MULTIPLIER_MAX, Math.max(MULTIPLIER_MIN, safe))
  const sapi = Math.round((10 * Math.log(clampedMultiplier)) / Math.log(3))
  return Math.min(SAPI_MAX, Math.max(SAPI_MIN, sapi))
}
