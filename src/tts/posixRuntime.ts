/**
 * Real macOS/Linux process wiring for the POSIX TTS engine: tool detection,
 * spawning (in its own process group so it can be killed cleanly), and the
 * one-shot "list voices" / "test voice" helpers. Only place that touches
 * `child_process` for POSIX, keeping `posix.ts` pure and testable.
 *
 * Experimental: implemented and unit-tested at the arg/lifecycle level but not
 * verified on real macOS/Linux hardware.
 */

import { spawn as nodeSpawn, spawnSync, ChildProcess } from 'child_process'
import { SpawnFn, TtsChildProcess } from './engine'
import { POSIX_TOOL_SPECS, PosixToolName, PosixToolSpec, buildPosixArgs } from './posix'
import type { InstalledVoice } from './windowsRuntime'

const oneShots = new Set<ChildProcess>()

function track(child: ChildProcess): ChildProcess {
  oneShots.add(child)
  const forget = (): void => {
    oneShots.delete(child)
  }
  child.on('exit', forget)
  child.on('error', forget)
  return child
}

export function disposePosixOneShots(): void {
  for (const child of oneShots) {
    try {
      if (child.pid !== undefined) {
        killPosixTree(child.pid)
      }
      child.kill()
    } catch {
      /* best effort */
    }
  }
  oneShots.clear()
}

function commandExists(command: string): boolean {
  try {
    return spawnSync('which', [command], { stdio: 'ignore' }).status === 0
  } catch {
    return false
  }
}

/** Detects the best available TTS tool for the platform, or null. */
export function detectPosixTool(platform: NodeJS.Platform): PosixToolSpec | null {
  const order: PosixToolName[] =
    platform === 'darwin' ? ['say'] : platform === 'linux' ? ['espeak-ng', 'espeak', 'spd-say'] : []
  for (const name of order) {
    if (commandExists(POSIX_TOOL_SPECS[name].command)) {
      return POSIX_TOOL_SPECS[name]
    }
  }
  return null
}

/** Adapts child_process.spawn to the engine's SpawnFn shape (own process group). */
export function createPosixSpawn(): SpawnFn {
  return (command: string, args: string[]): TtsChildProcess => {
    const child = nodeSpawn(command, args, {
      detached: true, // new process group so killPosixTree can kill the whole tree
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    return child as unknown as TtsChildProcess
  }
}

/** Kills a process group (falls back to the single pid). Best effort. */
export function killPosixTree(pid: number): void {
  try {
    process.kill(-pid, 'SIGKILL')
  } catch {
    try {
      process.kill(pid, 'SIGKILL')
    } catch {
      /* already gone */
    }
  }
}

const TEST_PHRASE = 'Hola. Esta es una prueba de la voz de Voicing.'

/** Speaks a short Spanish test phrase using the detected tool. */
export function posixSpeakTest(
  spec: PosixToolSpec,
  rate: number,
  volume: number,
  voice: string,
  language: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = { chunks: [TEST_PHRASE], rate, volume, voice, language }
    const args = buildPosixArgs(spec, req, spec.textViaStdin ? '' : TEST_PHRASE)
    const child = track(nodeSpawn(spec.command, args, { stdio: ['pipe', 'ignore', 'pipe'] }))
    let err = ''
    child.stderr?.on('data', (d) => {
      err += String(d)
    })
    child.on('error', reject)
    child.on('exit', (code) => {
      if (code === 0 || code === null) {
        resolve()
      } else {
        reject(new Error(err.trim() || `test voice failed (code ${code})`))
      }
    })
    if (spec.textViaStdin && child.stdin) {
      child.stdin.write(TEST_PHRASE)
      child.stdin.end()
    }
  })
}

/** Lists installed voices for the detected tool (best effort). */
export function posixListVoices(spec: PosixToolSpec): InstalledVoice[] {
  try {
    if (spec.name === 'say') {
      const out = spawnSync('say', ['-v', '?'], { encoding: 'utf8' }).stdout || ''
      return out
        .split(/\r?\n/)
        .map((line) => {
          // "Alex                en_US    # Most people recognize me..."
          const m = /^(.+?)\s{2,}([A-Za-z]{2}[-_][A-Za-z]{2})/.exec(line)
          return m ? { name: m[1].trim(), culture: m[2].replace('_', '-'), gender: '' } : null
        })
        .filter((v): v is InstalledVoice => v !== null)
    }
    if (spec.name === 'espeak' || spec.name === 'espeak-ng') {
      const out = spawnSync(spec.command, ['--voices'], { encoding: 'utf8' }).stdout || ''
      return out
        .split(/\r?\n/)
        .slice(1) // drop header
        .map((line) => {
          // "Pty Language Age/Gender VoiceName          File"
          const cols = line.trim().split(/\s+/)
          if (cols.length < 4) {
            return null
          }
          return { name: cols[3], culture: cols[1], gender: cols[2] }
        })
        .filter((v): v is InstalledVoice => v !== null)
    }
    // spd-say: voices depend on the active module; user sets one manually.
    return []
  } catch {
    return []
  }
}
