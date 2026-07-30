import { WindowsTtsEngine, TtsChildProcess, SpawnFn } from '../../tts/engine'
import { PlaybackStatus } from '../../types'

class FakeChild implements TtsChildProcess {
  static counter = 0
  readonly pid: number
  writes: string[] = []
  killed = false
  private dataCbs: Array<(c: unknown) => void> = []
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

  stdout = {
    on: (event: 'data', cb: (c: unknown) => void): void => {
      if (event === 'data') {
        this.dataCbs.push(cb)
      }
    },
  }

  on(event: 'exit' | 'error', cb: (arg: never) => void): void {
    if (event === 'exit') {
      this.exitCbs.push(cb as (code: number | null) => void)
    } else {
      this.errorCbs.push(cb as (err: Error) => void)
    }
  }

  kill(): boolean {
    this.killed = true
    return true
  }

  emitData(s: string): void {
    this.dataCbs.forEach((cb) => cb(s))
  }
  emitExit(code: number | null): void {
    this.exitCbs.forEach((cb) => cb(code))
  }
}

interface Setup {
  engine: WindowsTtsEngine
  children: FakeChild[]
  killed: number[]
  statuses: PlaybackStatus[]
}

function setup(): Setup {
  const children: FakeChild[] = []
  const killed: number[] = []
  const statuses: PlaybackStatus[] = []
  const spawn: SpawnFn = () => {
    const c = new FakeChild()
    children.push(c)
    return c
  }
  const engine = new WindowsTtsEngine({
    powershellPath: 'powershell.exe',
    scriptPath: 'speak.ps1',
    spawn,
    killTree: (pid) => killed.push(pid),
    onStatus: (s) => statuses.push(s),
  })
  return { engine, children, killed, statuses }
}

const req = (chunks: string[]) => ({ chunks, sapiRate: 6, volume: 100, voice: '' })

describe('WindowsTtsEngine lifecycle', () => {
  it('spawns a process, sends SPEAK per chunk and goes playing', async () => {
    const s = setup()
    await s.engine.read(req(['uno', 'dos']))
    expect(s.children).toHaveLength(1)
    const speaks = s.children[0].writes.filter((w) => w.startsWith('SPEAK '))
    expect(speaks).toHaveLength(2)
    expect(s.statuses).toContain('preparing')
    expect(s.statuses[s.statuses.length - 1]).toBe('playing')
  })

  it('a second read cleanly cancels the first (kill + new process)', async () => {
    const s = setup()
    await s.engine.read(req(['primero']))
    const first = s.children[0]
    await s.engine.read(req(['segundo']))
    expect(s.children).toHaveLength(2)
    expect(first.killed).toBe(true)
    expect(s.killed).toContain(first.pid)
    expect(s.statuses).toContain('stopped')
  })

  it('pause and resume write the right commands and statuses', async () => {
    const s = setup()
    await s.engine.read(req(['x']))
    s.engine.pause()
    s.engine.resume()
    const c = s.children[0]
    expect(c.writes).toContain('PAUSE\n')
    expect(c.writes).toContain('RESUME\n')
    expect(s.statuses).toContain('paused')
  })

  it('stop writes STOP + QUIT, kills the tree and goes stopped', async () => {
    const s = setup()
    await s.engine.read(req(['x']))
    await s.engine.stop()
    const c = s.children[0]
    expect(c.writes).toContain('STOP\n')
    expect(c.writes).toContain('QUIT\n')
    expect(c.killed).toBe(true)
    expect(s.statuses[s.statuses.length - 1]).toBe('stopped')
  })

  it('natural completion (EVT done) goes idle and quits the process', async () => {
    const s = setup()
    await s.engine.read(req(['x']))
    s.children[0].emitData('EVT done\n')
    expect(s.children[0].writes).toContain('QUIT\n')
    expect(s.statuses[s.statuses.length - 1]).toBe('idle')
  })

  it('ignores events from a stale (already-replaced) process', async () => {
    const s = setup()
    await s.engine.read(req(['a']))
    const first = s.children[0]
    await s.engine.read(req(['b']))
    const statusesBefore = [...s.statuses]
    first.emitData('EVT done\n') // stale event
    expect(s.statuses).toEqual(statusesBefore)
  })

  it('surfaces a non-zero exit code as an error', async () => {
    const s = setup()
    await s.engine.read(req(['x']))
    s.children[0].emitExit(1)
    expect(s.statuses[s.statuses.length - 1]).toBe('error')
  })

  it('dispose kills any running process', async () => {
    const s = setup()
    await s.engine.read(req(['x']))
    await s.engine.dispose()
    expect(s.children[0].killed).toBe(true)
  })
})
