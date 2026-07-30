/**
 * Playback state machine. Pure logic (no `vscode` import) so transitions are
 * unit-testable. Listeners are notified on every accepted state change.
 */

import { PlaybackStatus } from './types'

type Listener = (status: PlaybackStatus, previous: PlaybackStatus) => void

const ALLOWED: Record<PlaybackStatus, readonly PlaybackStatus[]> = {
  idle: ['preparing', 'playing', 'error'],
  preparing: ['playing', 'stopped', 'error', 'idle'],
  // A new read while one is active moves back to "preparing".
  playing: ['preparing', 'paused', 'stopped', 'error', 'idle'],
  paused: ['preparing', 'playing', 'stopped', 'error', 'idle'],
  stopped: ['idle', 'preparing', 'playing'],
  // Stop must be reachable after an error so the status bar clears.
  error: ['idle', 'preparing', 'playing', 'stopped'],
}

export class PlaybackState {
  private status: PlaybackStatus = 'idle'
  private readonly listeners = new Set<Listener>()

  get current(): PlaybackStatus {
    return this.status
  }

  /** Returns true if a transition from the current status to `to` is allowed. */
  canTransition(to: PlaybackStatus): boolean {
    if (to === this.status) {
      return false
    }
    return ALLOWED[this.status].includes(to)
  }

  /**
   * Attempts to move to `to`. Returns true and notifies listeners if the
   * transition is allowed; returns false and does nothing otherwise.
   */
  transition(to: PlaybackStatus): boolean {
    if (!this.canTransition(to)) {
      return false
    }
    const previous = this.status
    this.status = to
    for (const listener of this.listeners) {
      listener(to, previous)
    }
    return true
  }

  onChange(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  get isActive(): boolean {
    return this.status === 'playing' || this.status === 'paused' || this.status === 'preparing'
  }
}
