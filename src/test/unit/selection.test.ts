import { captureTerminalSelection, SelectionDeps } from '../../selection/core'

interface Harness {
  deps: SelectionDeps
  getClipboard(): string
  writes: string[]
}

/**
 * Builds a mock clipboard + fake clock. `onCopy` decides what the terminal
 * "copy selection" command does to the clipboard (e.g. set the selection, or
 * nothing when there is no selection).
 */
function makeHarness(initial: string, onCopy: (set: (v: string) => void) => void): Harness {
  let clipboard = initial
  let clock = 0
  const writes: string[] = []
  const deps: SelectionDeps = {
    readClipboard: () => Promise.resolve(clipboard),
    writeClipboard: (t) => {
      clipboard = t
      writes.push(t)
      return Promise.resolve()
    },
    copySelection: () => {
      onCopy((v) => {
        clipboard = v
      })
      return Promise.resolve()
    },
    delay: (ms) => {
      clock += ms
      return Promise.resolve()
    },
    now: () => clock,
  }
  return { deps, getClipboard: () => clipboard, writes }
}

describe('captureTerminalSelection', () => {
  it('captures the selection and restores the clipboard', async () => {
    const h = makeHarness('portapapeles previo', (set) => set('texto seleccionado'))
    const result = await captureTerminalSelection(h.deps, { restoreClipboard: true })
    expect(result.text).toBe('texto seleccionado')
    expect(h.getClipboard()).toBe('portapapeles previo')
  })

  it('returns null when nothing is selected (clipboard keeps the sentinel)', async () => {
    // onCopy does nothing -> the sentinel stays, meaning "no selection".
    const h = makeHarness('previo', () => undefined)
    const result = await captureTerminalSelection(h.deps, { restoreClipboard: true, timeoutMs: 200, pollMs: 40 })
    expect(result.text).toBeNull()
    // Even when nothing was captured, the sentinel must not be left behind.
    expect(h.getClipboard()).toBe('previo')
  })

  it('detects a selection equal to the previous clipboard (sentinel technique)', async () => {
    const h = makeHarness('mismo', (set) => set('mismo'))
    const result = await captureTerminalSelection(h.deps, { restoreClipboard: true })
    expect(result.text).toBe('mismo')
  })

  it('leaves the selection in the clipboard when restore is disabled', async () => {
    const h = makeHarness('previo', (set) => set('seleccion'))
    const result = await captureTerminalSelection(h.deps, { restoreClipboard: false })
    expect(result.text).toBe('seleccion')
    expect(h.getClipboard()).toBe('seleccion')
  })

  it('does not clobber the clipboard if the user changed it during the read', async () => {
    // Scripted reads: original, then the copied selection, then a value the user
    // put on the clipboard before restore runs.
    const reads = ['previo', 'seleccion', 'cambio del usuario', 'cambio del usuario']
    let i = 0
    const writes: string[] = []
    const deps: SelectionDeps = {
      readClipboard: () => Promise.resolve(reads[Math.min(i++, reads.length - 1)]),
      writeClipboard: (t) => {
        writes.push(t)
        return Promise.resolve()
      },
      copySelection: () => Promise.resolve(),
      delay: () => Promise.resolve(),
      now: () => 0,
    }
    const result = await captureTerminalSelection(deps, { restoreClipboard: true })
    expect(result.text).toBe('seleccion')
    // The user's value must be preserved: we must NOT have restored 'previo'.
    expect(writes).not.toContain('previo')
  })

  it('never leaves the sentinel behind when restore is disabled and nothing was selected', async () => {
    const h = makeHarness('previo', () => undefined)
    const result = await captureTerminalSelection(h.deps, { restoreClipboard: false, timeoutMs: 200, pollMs: 40 })
    expect(result.text).toBeNull()
    expect(h.getClipboard()).toBe('previo')
  })
})
