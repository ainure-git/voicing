/**
 * Diagnostic logger writing to a VS Code output channel. It NEVER logs the text
 * being read aloud — only lifecycle/diagnostic messages — to honour the privacy
 * guarantee. Debug-level messages are gated behind the `debugLogging` setting.
 */

import * as vscode from 'vscode'

export class Logger {
  constructor(
    private readonly channel: vscode.OutputChannel,
    private readonly isDebugEnabled: () => boolean,
  ) {}

  private line(level: string, message: string): void {
    this.channel.appendLine(`${new Date().toISOString()} [${level}] ${message}`)
  }

  debug(message: string): void {
    if (this.isDebugEnabled()) {
      this.line('DEBUG', message)
    }
  }

  info(message: string): void {
    this.line('INFO', message)
  }

  warn(message: string): void {
    this.line('WARN', message)
  }

  error(message: string): void {
    this.line('ERROR', message)
  }
}
