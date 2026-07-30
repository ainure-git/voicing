/**
 * No-op TTS engine used on non-Windows platforms. Playback is unavailable but
 * the extension keeps working (text processing, selection capture, etc.).
 */

import { PlaybackStatus } from '../types'
import { SpeakRequest, TtsEngine } from './engine'

export class UnsupportedTtsEngine implements TtsEngine {
  readonly supported = false

  constructor(private readonly onStatus?: (status: PlaybackStatus) => void) {}

  async read(_req: SpeakRequest): Promise<void> {
    this.onStatus?.('idle')
  }

  pause(): void {
    /* no-op */
  }

  resume(): void {
    /* no-op */
  }

  async stop(): Promise<void> {
    this.onStatus?.('idle')
  }

  async dispose(): Promise<void> {
    /* no-op */
  }
}
