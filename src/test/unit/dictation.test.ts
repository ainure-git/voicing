import { pickDictationCommand } from '../../dictation'

describe('pickDictationCommand', () => {
  it('returns undefined when no dictation command exists', () => {
    expect(pickDictationCommand(['workbench.action.terminal.copySelection', 'editor.action.foo'])).toBeUndefined()
  })

  it('returns a terminal-scoped dictation command', () => {
    const cmds = [
      'workbench.action.editorDictation.start',
      'workbench.action.terminal.startDictation',
      'workbench.action.startDictation',
    ]
    expect(pickDictationCommand(cmds)).toBe('workbench.action.terminal.startDictation')
  })

  it('does NOT use a non-terminal (editor/chat) dictation command', () => {
    // Cursor's chat/editor dictation types into the chat, not the terminal.
    expect(pickDictationCommand(['workbench.action.editorDictation.start'])).toBeUndefined()
    expect(pickDictationCommand(['workbench.action.startDictation'])).toBeUndefined()
  })

  it("does NOT match the extension's own output-channel command (regression)", () => {
    const cmds = [
      'workbench.action.output.show.extension-output-eureka-local.terminal-voice-controls-#1-Terminal Voice Controls.workspaceId-ff820e5a',
      'terminalVoice.dictate',
      'terminalVoice.readSelection',
    ]
    expect(pickDictationCommand(cmds)).toBeUndefined()
  })

  it('does not match a bare "voice" command that is not dictation', () => {
    expect(pickDictationCommand(['workbench.action.startVoiceChat'])).toBeUndefined()
  })
})
