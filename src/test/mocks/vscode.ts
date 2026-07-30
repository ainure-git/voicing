/**
 * Minimal `vscode` stand-in for Jest. Only the surface actually referenced by
 * unit-tested modules needs to exist; the pure-logic units under test do not
 * import `vscode` at all, so this is a safety net.
 */

export enum StatusBarAlignment {
  Left = 1,
  Right = 2,
}

export enum ConfigurationTarget {
  Global = 1,
  Workspace = 2,
  WorkspaceFolder = 3,
}

export const window = {
  createOutputChannel: () => ({ appendLine: () => undefined, dispose: () => undefined }),
  createStatusBarItem: () => ({
    text: '',
    tooltip: '',
    command: '',
    show: () => undefined,
    hide: () => undefined,
    dispose: () => undefined,
  }),
  showInformationMessage: () => Promise.resolve(undefined),
  showWarningMessage: () => Promise.resolve(undefined),
  showErrorMessage: () => Promise.resolve(undefined),
  showQuickPick: () => Promise.resolve(undefined),
  get activeTerminal() {
    return undefined
  },
}

export const commands = {
  getCommands: () => Promise.resolve([] as string[]),
  executeCommand: () => Promise.resolve(undefined),
  registerCommand: () => ({ dispose: () => undefined }),
}

export const env = {
  clipboard: {
    readText: () => Promise.resolve(''),
    writeText: () => Promise.resolve(),
  },
}

export const workspace = {
  getConfiguration: () => ({
    get: () => undefined,
    update: () => Promise.resolve(),
  }),
  onDidChangeConfiguration: () => ({ dispose: () => undefined }),
}
