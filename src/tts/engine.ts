/**
 * TTS engine core. The Windows engine drives a single long-lived PowerShell
 * "controller" process that owns a System.Speech.SpeechSynthesizer and reacts
 * to a tiny line protocol over stdin:
 *
 *     SPEAK <base64-utf8>   queue an utterance (SpeakAsync)
 *     PAUSE / RESUME        pause/resume the synthesizer
 *     STOP                  cancel all queued/active speech
 *     QUIT                  exit the process
 *
 * The process emits `READY`, `EVT started`, `EVT completed`, `WARN ...` and
 * `ERR ...` lines on stdout. Text is only ever passed as Base64 over stdin, so
 * command injection is structurally impossible.
 *
 * The child process is abstracted behind `SpawnFn`/`TtsChildProcess` so the
 * lifecycle (start / cancel-previous / stop / cleanup) is unit-testable with a
 * fake spawner, no real PowerShell required.
 */

import { PlaybackStatus } from '../types'
import { toBase64Utf8 } from './encoding'

export interface SpeakRequest {
  chunks: string[]
  /** SAPI rate in [-10, 10]. */
  sapiRate: number
  /** Volume in [0, 100]. */
  volume: number
  /** Exact voice name or "" for default. */
  voice: string
}

export interface TtsEngine {
  readonly supported: boolean
  read(req: SpeakRequest): Promise<void>
  pause(): void
  resume(): void
  stop(): Promise<void>
  dispose(): Promise<void>
}

/** Minimal child-process surface the engine depends on. */
export interface TtsChildProcess {
  readonly pid: number | undefined
  stdin: {
    write(data: string): void
    end(): void
  }
  stdout: { on(event: 'data', cb: (chunk: unknown) => void): void }
  stderr?: { on(event: 'data', cb: (chunk: unknown) => void): void }
  on(event: 'exit', cb: (code: number | null) => void): void
  on(event: 'error', cb: (err: Error) => void): void
  kill(signal?: string): boolean
}

export type SpawnFn = (command: string, args: string[]) => TtsChildProcess

export interface EngineLogger {
  debug(message: string): void
  warn(message: string): void
  error(message: string): void
}

export interface WindowsTtsOptions {
  powershellPath: string
  scriptPath: string
  spawn: SpawnFn
  killTree?: (pid: number) => void
  onStatus?: (status: PlaybackStatus) => void
  onError?: (message: string) => void
  logger?: EngineLogger
}

function clampInt(value: number, min: number, max: number): number {
  const n = Number.isFinite(value) ? Math.round(value) : 0
  return Math.min(max, Math.max(min, n))
}

/** Builds the argv for the long-lived controller process. */
export function buildControllerArgs(scriptPath: string, req: SpeakRequest): string[] {
  return [
    '-NoProfile',
    '-NonInteractive',
    '-ExecutionPolicy',
    'Bypass',
    '-File',
    scriptPath,
    '-Mode',
    'controller',
    '-Rate',
    String(clampInt(req.sapiRate, -10, 10)),
    '-Volume',
    String(clampInt(req.volume, 0, 100)),
    '-Voice',
    req.voice ?? '',
  ]
}

/** Builds the argv for a one-shot "test voice" run. */
export function buildTestArgs(scriptPath: string, sapiRate: number, volume: number, voice: string): string[] {
  return [
    '-NoProfile',
    '-NonInteractive',
    '-ExecutionPolicy',
    'Bypass',
    '-File',
    scriptPath,
    '-Mode',
    'test',
    '-Rate',
    String(clampInt(sapiRate, -10, 10)),
    '-Volume',
    String(clampInt(volume, 0, 100)),
    '-Voice',
    voice ?? '',
  ]
}

/** Builds the argv for a one-shot "list voices" run. */
export function buildListArgs(scriptPath: string): string[] {
  return [
    '-NoProfile',
    '-NonInteractive',
    '-ExecutionPolicy',
    'Bypass',
    '-File',
    scriptPath,
    '-Mode',
    'list',
  ]
}

export class WindowsTtsEngine implements TtsEngine {
  readonly supported = true

  private proc: TtsChildProcess | undefined
  private stopping = false
  private finishedNaturally = false
  private stdoutBuffer = ''

  constructor(private readonly opts: WindowsTtsOptions) {}

  async read(req: SpeakRequest): Promise<void> {
    // A new reading always cancels the previous one cleanly.
    await this.stop()

    if (req.chunks.length === 0) {
      this.setStatus('idle')
      return
    }

    this.setStatus('preparing')
    this.stopping = false
    this.finishedNaturally = false
    this.stdoutBuffer = ''

    const proc = this.opts.spawn(this.opts.powershellPath, buildControllerArgs(this.opts.scriptPath, req))
    this.proc = proc

    proc.stdout.on('data', (chunk) => {
      if (this.proc !== proc) {
        return
      }
      this.onStdout(String(chunk))
    })
    proc.on('error', (err) => {
      if (this.proc !== proc) {
        return
      }
      this.opts.logger?.error(`tts process error: ${err.message}`)
      this.opts.onError?.(err.message)
      this.proc = undefined
      this.setStatus('error')
    })
    proc.on('exit', (code) => {
      if (this.proc !== proc) {
        return
      }
      this.onExit(code)
    })

    for (const chunk of req.chunks) {
      this.write(`SPEAK ${toBase64Utf8(chunk)}`)
    }

    this.setStatus('playing')
  }

  pause(): void {
    if (this.proc && !this.stopping) {
      this.write('PAUSE')
      this.setStatus('paused')
    }
  }

  resume(): void {
    if (this.proc && !this.stopping) {
      this.write('RESUME')
      this.setStatus('playing')
    }
  }

  async stop(): Promise<void> {
    const proc = this.proc
    if (!proc) {
      return
    }
    this.stopping = true
    this.write('STOP')
    this.write('QUIT')
    try {
      proc.stdin.end()
    } catch {
      // ignore
    }
    if (proc.pid !== undefined && this.opts.killTree) {
      this.opts.killTree(proc.pid)
    }
    try {
      proc.kill()
    } catch {
      // ignore
    }
    this.proc = undefined
    this.setStatus('stopped')
  }

  async dispose(): Promise<void> {
    await this.stop()
  }

  private onStdout(data: string): void {
    this.stdoutBuffer += data
    let idx = this.stdoutBuffer.indexOf('\n')
    while (idx >= 0) {
      const line = this.stdoutBuffer.slice(0, idx).trim()
      this.stdoutBuffer = this.stdoutBuffer.slice(idx + 1)
      if (line.length > 0) {
        this.handleLine(line)
      }
      idx = this.stdoutBuffer.indexOf('\n')
    }
  }

  private handleLine(line: string): void {
    if (line === 'EVT done') {
      if (!this.stopping) {
        this.finishedNaturally = true
        this.write('QUIT')
        this.setStatus('idle')
      }
    } else if (line.startsWith('WARN ')) {
      this.opts.logger?.warn(`tts: ${line.slice(5)}`)
    } else if (line.startsWith('ERR ')) {
      this.opts.onError?.(line.slice(4))
      this.setStatus('error')
    } else if (line === 'READY') {
      this.opts.logger?.debug('tts: READY')
    }
  }

  private onExit(code: number | null): void {
    const wasStopping = this.stopping
    const finished = this.finishedNaturally
    this.proc = undefined
    if (wasStopping || finished) {
      // stop() already set 'stopped'; natural completion already set 'idle'.
      return
    }
    if (code !== null && code !== 0) {
      this.opts.onError?.(`El proceso de voz terminó con código ${code}.`)
      this.setStatus('error')
    } else {
      this.setStatus('idle')
    }
  }

  private write(line: string): void {
    const proc = this.proc
    if (!proc) {
      return
    }
    try {
      proc.stdin.write(`${line}\n`)
    } catch (err) {
      this.opts.logger?.warn(`tts write failed: ${(err as Error).message}`)
    }
  }

  private setStatus(status: PlaybackStatus): void {
    this.opts.onStatus?.(status)
  }
}
