/**
 * Cross-platform (macOS / Linux) TTS engine core.
 *
 * macOS uses the built-in `say`; Linux prefers `espeak-ng`/`espeak` (which
 * synthesise and play in-process, so SIGSTOP/SIGCONT can pause/resume the
 * audio) and falls back to `spd-say`. Text is delivered over stdin where the
 * tool supports it, or as a single argv element (safe under a no-shell spawn) —
 * never through a shell, so command injection is not possible.
 *
 * NOTE: this engine is exercised by unit tests (arg building + lifecycle with a
 * fake spawn) but has not been verified on real macOS/Linux hardware. It is
 * shipped as experimental; see TECHNICAL_DECISIONS.md.
 */

import { PlaybackStatus } from '../types'
import { EngineLogger, SpawnFn, SpeakRequest, TtsChildProcess, TtsEngine } from './engine'

export type PosixToolName = 'say' | 'espeak-ng' | 'espeak' | 'spd-say'

export interface PosixToolSpec {
  name: PosixToolName
  command: string
  /** true: text is piped over stdin; false: text is passed as the last argv. */
  textViaStdin: boolean
  /** true when SIGSTOP/SIGCONT meaningfully pause/resume the audio. */
  supportsPauseSignals: boolean
}

export const POSIX_TOOL_SPECS: Record<PosixToolName, PosixToolSpec> = {
  say: { name: 'say', command: 'say', textViaStdin: true, supportsPauseSignals: true },
  'espeak-ng': { name: 'espeak-ng', command: 'espeak-ng', textViaStdin: true, supportsPauseSignals: true },
  espeak: { name: 'espeak', command: 'espeak', textViaStdin: true, supportsPauseSignals: true },
  // spd-say is a thin client to the speech-dispatcher daemon; stopping the
  // client process does not pause the daemon's audio.
  'spd-say': { name: 'spd-say', command: 'spd-say', textViaStdin: false, supportsPauseSignals: false },
}

function clamp(value: number, min: number, max: number): number {
  const n = Number.isFinite(value) ? Math.round(value) : min
  return Math.min(max, Math.max(min, n))
}

// --- Rate/volume conversions (documented in TECHNICAL_DECISIONS.md) ---------

/** macOS `say -r` words-per-minute. Base 180 wpm * multiplier. */
export function sayWordsPerMinute(rate: number): number {
  return clamp(180 * rate, 90, 720)
}

/** espeak `-s` words-per-minute. Base 175 wpm * multiplier. */
export function espeakWordsPerMinute(rate: number): number {
  return clamp(175 * rate, 80, 600)
}

/** espeak `-a` amplitude 0–200 from volume 0–100. */
export function espeakAmplitude(volume: number): number {
  return clamp((volume / 100) * 200, 0, 200)
}

/** spd-say `-r` rate −100..100 from the 0.5–3.0 multiplier. */
export function spdSayRate(rate: number): number {
  return clamp((rate - 1) * 100, -100, 100)
}

/** spd-say `-i` volume −100..100 from volume 0–100. */
export function spdSayVolume(volume: number): number {
  return clamp(volume * 2 - 100, -100, 100)
}

/**
 * Builds the argv for a POSIX TTS tool. When `spec.textViaStdin` is false the
 * text is appended (after `--`) as a single argv element — safe because the
 * process is spawned without a shell.
 */
export function buildPosixArgs(spec: PosixToolSpec, req: SpeakRequest, text: string): string[] {
  switch (spec.name) {
    case 'say': {
      const args = ['-r', String(sayWordsPerMinute(req.rate))]
      if (req.voice) {
        args.push('-v', req.voice)
      }
      return args
    }
    case 'espeak-ng':
    case 'espeak': {
      const args = ['-s', String(espeakWordsPerMinute(req.rate)), '-a', String(espeakAmplitude(req.volume))]
      if (req.voice) {
        args.push('-v', req.voice)
      } else if (req.language) {
        args.push('-v', req.language)
      }
      args.push('--stdin')
      return args
    }
    case 'spd-say': {
      const args = ['-w', '-r', String(spdSayRate(req.rate)), '-i', String(spdSayVolume(req.volume))]
      if (req.voice) {
        args.push('-y', req.voice)
      }
      if (req.language) {
        args.push('-l', req.language)
      }
      args.push('--', text)
      return args
    }
    default:
      return []
  }
}

export interface PosixTtsOptions {
  spec: PosixToolSpec
  spawn: SpawnFn
  killTree?: (pid: number) => void
  onStatus?: (status: PlaybackStatus) => void
  onError?: (message: string) => void
  logger?: EngineLogger
}

/**
 * TTS engine for macOS/Linux. One process per read; completion is the process
 * exit; a new read cancels the previous; pause/resume use SIGSTOP/SIGCONT when
 * the tool plays audio in-process.
 */
export class PosixTtsEngine implements TtsEngine {
  readonly supported = true

  private proc: TtsChildProcess | undefined
  private stopping = false
  private pauseWarned = false

  constructor(private readonly opts: PosixTtsOptions) {}

  async read(req: SpeakRequest): Promise<void> {
    await this.stop()

    if (req.chunks.length === 0) {
      this.setStatus('idle')
      return
    }

    this.setStatus('preparing')
    this.stopping = false
    this.pauseWarned = false

    const text = req.chunks.join('\n')
    const spec = this.opts.spec
    const args = buildPosixArgs(spec, req, spec.textViaStdin ? '' : text)
    const proc = this.opts.spawn(spec.command, args)
    this.proc = proc

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

    if (spec.textViaStdin) {
      try {
        proc.stdin.write(text)
        proc.stdin.end()
      } catch (err) {
        this.opts.logger?.warn(`tts stdin write failed: ${(err as Error).message}`)
      }
    }

    this.setStatus('playing')
  }

  pause(): void {
    if (!this.proc || this.stopping) {
      return
    }
    if (!this.opts.spec.supportsPauseSignals) {
      if (!this.pauseWarned) {
        this.pauseWarned = true
        this.opts.logger?.warn(`pause/resume not supported by ${this.opts.spec.name}`)
      }
      return
    }
    try {
      this.proc.kill('SIGSTOP')
      this.setStatus('paused')
    } catch (err) {
      this.opts.logger?.warn(`pause failed: ${(err as Error).message}`)
    }
  }

  resume(): void {
    if (!this.proc || this.stopping || !this.opts.spec.supportsPauseSignals) {
      return
    }
    try {
      this.proc.kill('SIGCONT')
      this.setStatus('playing')
    } catch (err) {
      this.opts.logger?.warn(`resume failed: ${(err as Error).message}`)
    }
  }

  async stop(): Promise<void> {
    const proc = this.proc
    if (!proc) {
      return
    }
    this.stopping = true
    // Ensure a paused (SIGSTOP'd) process can actually be killed.
    try {
      proc.kill('SIGCONT')
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

  private onExit(code: number | null): void {
    const wasStopping = this.stopping
    this.proc = undefined
    if (wasStopping) {
      return
    }
    if (code !== null && code !== 0) {
      this.opts.onError?.(`El proceso de voz terminó con código ${code}.`)
      this.setStatus('error')
    } else {
      this.setStatus('idle')
    }
  }

  private setStatus(status: PlaybackStatus): void {
    this.opts.onStatus?.(status)
  }
}
