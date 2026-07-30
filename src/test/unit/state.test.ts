import { PlaybackState } from '../../state'

describe('PlaybackState', () => {
  it('starts idle', () => {
    expect(new PlaybackState().current).toBe('idle')
  })

  it('allows idle -> preparing -> playing', () => {
    const s = new PlaybackState()
    expect(s.transition('preparing')).toBe(true)
    expect(s.transition('playing')).toBe(true)
    expect(s.current).toBe('playing')
  })

  it('allows playing <-> paused', () => {
    const s = new PlaybackState()
    s.transition('playing')
    expect(s.transition('paused')).toBe(true)
    expect(s.transition('playing')).toBe(true)
  })

  it('rejects invalid transitions (idle -> paused)', () => {
    const s = new PlaybackState()
    expect(s.transition('paused')).toBe(false)
    expect(s.current).toBe('idle')
  })

  it('rejects a no-op transition to the same state', () => {
    const s = new PlaybackState()
    expect(s.transition('idle')).toBe(false)
  })

  it('notifies listeners with new and previous state', () => {
    const s = new PlaybackState()
    const seen: Array<[string, string]> = []
    s.onChange((to, prev) => seen.push([to, prev]))
    s.transition('playing')
    s.transition('stopped')
    expect(seen).toEqual([
      ['playing', 'idle'],
      ['stopped', 'playing'],
    ])
  })

  it('stops listening after unsubscribe', () => {
    const s = new PlaybackState()
    let count = 0
    const off = s.onChange(() => (count += 1))
    s.transition('playing')
    off()
    s.transition('paused')
    expect(count).toBe(1)
  })

  it('reports isActive correctly', () => {
    const s = new PlaybackState()
    expect(s.isActive).toBe(false)
    s.transition('playing')
    expect(s.isActive).toBe(true)
    s.transition('stopped')
    expect(s.isActive).toBe(false)
  })
})
