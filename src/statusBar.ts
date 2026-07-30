/**
 * Discreet status-bar controls that reflect the current playback state. These
 * are the reliable, public alternative to true terminal-header buttons (which
 * VS Code does not expose to extensions). Items are shown/hidden depending on
 * state so the bar stays uncluttered.
 */

import * as vscode from 'vscode'
import { PlaybackStatus } from './types'

const STATUS_LABEL: Record<PlaybackStatus, string> = {
  idle: '',
  preparing: 'Preparando',
  playing: 'Reproduciendo',
  paused: 'Pausado',
  stopped: 'Detenido',
  error: 'Error',
}

export class StatusBarController {
  private readonly status: vscode.StatusBarItem
  private readonly read: vscode.StatusBarItem
  private readonly pauseResume: vscode.StatusBarItem
  private readonly stop: vscode.StatusBarItem
  private readonly dictate: vscode.StatusBarItem

  private enabled = true
  private current: PlaybackStatus = 'idle'

  constructor() {
    // Lower priority = further right. Group them together on the right side.
    this.status = this.make('terminalVoice.status', 96, '', undefined)
    this.dictate = this.make('terminalVoice.sbDictate', 95, '$(mic)', 'terminalVoice.dictate', 'Terminal Voice: Dictar')
    this.read = this.make(
      'terminalVoice.sbRead',
      94,
      '$(unmute)',
      'terminalVoice.readSelection',
      'Terminal Voice: Leer selección',
    )
    this.pauseResume = this.make(
      'terminalVoice.sbPauseResume',
      93,
      '$(debug-pause)',
      'terminalVoice.pauseResume',
      'Terminal Voice: Pausar o reanudar',
    )
    this.stop = this.make('terminalVoice.sbStop', 92, '$(debug-stop)', 'terminalVoice.stop', 'Terminal Voice: Detener')
  }

  private make(
    id: string,
    priority: number,
    text: string,
    command: string | undefined,
    tooltip?: string,
  ): vscode.StatusBarItem {
    const item = vscode.window.createStatusBarItem(id, vscode.StatusBarAlignment.Right, priority)
    item.text = text
    if (command) {
      item.command = command
    }
    if (tooltip) {
      item.tooltip = tooltip
    }
    return item
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled
    this.render()
  }

  setStatus(status: PlaybackStatus): void {
    this.current = status
    this.render()
  }

  private render(): void {
    if (!this.enabled) {
      this.hideAll()
      return
    }

    // Always-available controls.
    this.dictate.show()
    this.read.show()

    const active = this.current === 'playing' || this.current === 'paused' || this.current === 'preparing'

    if (active) {
      this.pauseResume.text = this.current === 'paused' ? '$(debug-continue)' : '$(debug-pause)'
      this.pauseResume.tooltip = this.current === 'paused' ? 'Terminal Voice: Reanudar' : 'Terminal Voice: Pausar'
      this.pauseResume.show()
      this.stop.show()
    } else {
      this.pauseResume.hide()
      this.stop.hide()
    }

    const label = STATUS_LABEL[this.current]
    if (label) {
      this.status.text = `$(megaphone) ${label}`
      this.status.show()
    } else {
      this.status.hide()
    }
  }

  private hideAll(): void {
    this.status.hide()
    this.dictate.hide()
    this.read.hide()
    this.pauseResume.hide()
    this.stop.hide()
  }

  dispose(): void {
    this.status.dispose()
    this.dictate.dispose()
    this.read.dispose()
    this.pauseResume.dispose()
    this.stop.dispose()
  }
}
