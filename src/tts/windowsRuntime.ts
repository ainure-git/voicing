/**
 * Real Windows process wiring for the TTS engine: spawning the controller,
 * killing the process tree, and the one-shot "list voices" / "test voice"
 * helpers. This module is the only place that touches `child_process`, so the
 * engine core stays pure and testable.
 */

import { spawn as nodeSpawn, ChildProcess } from 'child_process'
import * as path from 'path'
import { SpawnFn, TtsChildProcess, buildListArgs, buildTestArgs } from './engine'

/**
 * Registry of one-shot helper processes (list voices / test voice). The main
 * controller process is managed by the engine, but these short-lived helpers
 * must also be killable on deactivate so nothing is orphaned — e.g. a blocking
 * `test` speak that is still running when the window reloads.
 */
const oneShots = new Set<ChildProcess>()

function track<T extends ChildProcess>(child: T): T {
  oneShots.add(child)
  const forget = (): void => {
    oneShots.delete(child)
  }
  child.on('exit', forget)
  child.on('error', forget)
  return child
}

/** Kills any still-running one-shot helper processes. */
export function disposeOneShots(): void {
  for (const child of oneShots) {
    try {
      if (child.pid !== undefined) {
        killTree(child.pid)
      }
      child.kill()
    } catch {
      /* best effort */
    }
  }
  oneShots.clear()
}

/**
 * Windows PowerShell (5.1) is preferred over pwsh 7 because System.Speech is
 * part of the .NET Framework and is always loadable there via
 * `Add-Type -AssemblyName System.Speech`. On PS7 (.NET) that assembly is not
 * guaranteed to be present.
 */
export function resolvePowerShellPath(): string {
  const systemRoot = process.env.SystemRoot || process.env.windir || 'C:\\Windows'
  const full = path.join(systemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe')
  return full
}

/** Adapts child_process.spawn to the engine's SpawnFn shape. */
export const createWindowsSpawn = (): SpawnFn => {
  return (command: string, args: string[]): TtsChildProcess => {
    const child = nodeSpawn(command, args, {
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    return child as unknown as TtsChildProcess
  }
}

/** Force-kills a process and its children by PID. Errors are swallowed. */
export function killTree(pid: number): void {
  try {
    const killer = nodeSpawn('taskkill', ['/PID', String(pid), '/T', '/F'], {
      windowsHide: true,
      stdio: 'ignore',
    })
    killer.on('error', () => {
      /* ignore — best effort */
    })
  } catch {
    /* ignore */
  }
}

export interface InstalledVoice {
  name: string
  culture: string
  gender: string
}

/** Runs the script in "list" mode and parses the installed voices. */
export function listInstalledVoices(powershellPath: string, scriptPath: string): Promise<InstalledVoice[]> {
  return new Promise((resolve, reject) => {
    const child = track(
      nodeSpawn(powershellPath, buildListArgs(scriptPath), {
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      }),
    )
    let out = ''
    let err = ''
    child.stdout.on('data', (d) => {
      out += String(d)
    })
    child.stderr.on('data', (d) => {
      err += String(d)
    })
    child.on('error', reject)
    child.on('exit', (code) => {
      if (code !== 0 && out.indexOf('VOICE\t') === -1) {
        reject(new Error(err.trim() || `list voices failed (code ${code})`))
        return
      }
      const voices: InstalledVoice[] = []
      for (const line of out.split(/\r?\n/)) {
        if (line.startsWith('VOICE\t')) {
          const parts = line.split('\t')
          voices.push({
            name: parts[1] ?? '',
            culture: parts[2] ?? '',
            gender: parts[3] ?? '',
          })
        }
      }
      resolve(voices)
    })
  })
}

/** Runs the script in "test" mode (speaks a short Spanish phrase). */
export function speakTest(
  powershellPath: string,
  scriptPath: string,
  sapiRate: number,
  volume: number,
  voice: string,
  language = '',
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = track(
      nodeSpawn(powershellPath, buildTestArgs(scriptPath, sapiRate, volume, voice, language), {
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      }),
    )
    let err = ''
    child.stderr.on('data', (d) => {
      err += String(d)
    })
    child.on('error', reject)
    child.on('exit', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(err.trim() || `test voice failed (code ${code})`))
      }
    })
  })
}
