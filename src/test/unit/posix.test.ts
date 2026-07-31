import {
  buildPosixArgs,
  sayWordsPerMinute,
  espeakWordsPerMinute,
  espeakAmplitude,
  spdSayRate,
  spdSayVolume,
  POSIX_TOOL_SPECS,
  PosixTtsEngine,
} from '../../tts/posix'
import { SpawnFn, TtsChildProcess } from '../../tts/engine'
import { PlaybackStatus } from '../../types'

const req = (over: Partial<{ rate: number; volume: number; voice: string; language: string }> = {}) => ({
  chunks: ['hola'],
  rate: 2.0,
  volume: 100,
  voice: '',
  language: '',
  ...over,
})

describe('POSIX rate/volume conversions', () => {
  it('maps the say words-per-minute and clamps', () => {
    expect(sayWordsPerMinute(1.0)).toBe(180)
    expect(sayWordsPerMinute(2.0)).toBe(360)
    expect(sayWordsPerMinute(99)).toBe(720)
    expect(sayWordsPerMinute(0.01)).toBe(90)
  })
  it('maps espeak wpm and amplitude', () => {
    expect(espeakWordsPerMinute(1.0)).toBe(175)
    expect(espeakAmplitude(100)).toBe(200)
    expect(espeakAmplitude(50)).toBe(100)
  })
  it('maps spd-say rate/volume', () => {
    expect(spdSayRate(1.0)).toBe(0)
    expect(spdSayRate(2.0)).toBe(100)
    expect(spdSayRate(0.5)).toBe(-50)
    expect(spdSayVolume(100)).toBe(100)
    expect(spdSayVolume(0)).toBe(-100)
  })
})

describe('buildPosixArgs', () => {
  it('say: rate + voice, text via stdin (not in argv)', () => {
    const args = buildPosixArgs(POSIX_TOOL_SPECS.say, req({ voice: 'Mónica' }), '')
    expect(args).toEqual(['-r', '360', '-v', 'Mónica'])
  })

  it('espeak: rate, amplitude, language fallback, --stdin', () => {
    const args = buildPosixArgs(POSIX_TOOL_SPECS['espeak-ng'], req({ language: 'es' }), '')
    expect(args).toContain('--stdin')
    expect(args).toContain('-v')
    expect(args[args.indexOf('-v') + 1]).toBe('es')
  })

  it('spd-say: text passed after -- as a single safe argv element', () => {
    const malicious = '"; rm -rf / #'
    const args = buildPosixArgs(POSIX_TOOL_SPECS['spd-say'], req({ language: 'es' }), malicious)
    // The dangerous text is a single argv item (no shell), isolated after "--".
    const dashDash = args.indexOf('--')
    expect(dashDash).toBeGreaterThanOrEqual(0)
    expect(args[dashDash + 1]).toBe(malicious)
    expect(args[args.length - 1]).toBe(malicious)
  })
})

// --- Engine lifecycle ------------------------------------------------------

class FakeChild implements TtsChildProcess {
  static counter = 0
  readonly pid: number
  writes: string[] = []
  signals: string[] = []
  killedDefault = false
  private exitCbs: Array<(code: number | null) => void> = []
  private errorCbs: Array<(err: Error) => void> = []

  constructor() {
    FakeChild.counter += 1
    this.pid = FakeChild.counter
  }
  stdin = {
    write: (d: string): void => {
      this.writes.push(d)
    },
    end: (): void => undefined,
  }
  stdout = { on: (): void => undefined }
  on(event: 'exit' | 'error', cb: (arg: never) => void): void {
    if (event === 'exit') {
      this.exitCbs.push(cb as (code: number | null) => void)
    } else {
      this.errorCbs.push(cb as (err: Error) => void)
    }
  }
  kill(signal?: string): boolean {
    if (signal) {
      this.signals.push(signal)
    } else {
      this.killedDefault = true
    }
    return true
  }
  emitExit(code: number | null): void {
    this.exitCbs.forEach((cb) => cb(code))
  }
}

function setup(specName: keyof typeof POSIX_TOOL_SPECS) {
  const children: FakeChild[] = []
  const killed: number[] = []
  const statuses: PlaybackStatus[] = []
  const spawn: SpawnFn = () => {
    const c = new FakeChild()
    children.push(c)
    return c
  }
  const engine = new PosixTtsEngine({
    spec: POSIX_TOOL_SPECS[specName],
    spawn,
    killTree: (pid) => killed.push(pid),
    onStatus: (s) => statuses.push(s),
  })
  return { engine, children, killed, statuses }
}

describe('PosixTtsEngine lifecycle', () => {
  it('say: spawns, pipes text via stdin, goes playing', async () => {
    const s = setup('say')
    await s.engine.read(req({ voice: 'Alex' }))
    expect(s.children).toHaveLength(1)
    expect(s.children[0].writes).toContain('hola')
    expect(s.statuses[s.statuses.length - 1]).toBe('playing')
  })

  it('a second read cancels the first (kill + new process)', async () => {
    const s = setup('espeak')
    await s.engine.read(req())
    const first = s.children[0]
    await s.engine.read(req())
    expect(s.children).toHaveLength(2)
    expect(first.killedDefault).toBe(true)
    expect(s.killed).toContain(first.pid)
    expect(s.statuses).toContain('stopped')
  })

  it('pause/resume send SIGSTOP/SIGCONT when supported', async () => {
    const s = setup('say')
    await s.engine.read(req())
    s.engine.pause()
    s.engine.resume()
    expect(s.children[0].signals).toContain('SIGSTOP')
    expect(s.children[0].signals).toContain('SIGCONT')
    expect(s.statuses).toContain('paused')
  })

  it('pause is a no-op (no status change) for spd-say', async () => {
    const s = setup('spd-say')
    await s.engine.read(req())
    const before = [...s.statuses]
    s.engine.pause()
    expect(s.statuses).toEqual(before)
    expect(s.children[0].signals).not.toContain('SIGSTOP')
  })

  it('natural exit(0) goes idle', async () => {
    const s = setup('say')
    await s.engine.read(req())
    s.children[0].emitExit(0)
    expect(s.statuses[s.statuses.length - 1]).toBe('idle')
  })

  it('non-zero exit surfaces an error', async () => {
    const s = setup('say')
    await s.engine.read(req())
    s.children[0].emitExit(1)
    expect(s.statuses[s.statuses.length - 1]).toBe('error')
  })

  it('stop resumes-then-kills and goes stopped', async () => {
    const s = setup('say')
    await s.engine.read(req())
    await s.engine.stop()
    expect(s.children[0].signals).toContain('SIGCONT')
    expect(s.children[0].killedDefault).toBe(true)
    expect(s.statuses[s.statuses.length - 1]).toBe('stopped')
  })
})
