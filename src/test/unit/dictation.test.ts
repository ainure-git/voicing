import { pickDictationCommand } from '../../dictation'

describe('pickDictationCommand', () => {
  it('returns undefined when no dictation command exists', () => {
    expect(pickDictationCommand(['workbench.action.terminal.copySelection', 'editor.action.foo'])).toBeUndefined()
  })

  it('prefers a terminal-specific dictation command', () => {
    const cmds = [
      'workbench.action.editorDictation.start',
      'workbench.action.terminal.startDictation',
      'workbench.action.startDictation',
    ]
    expect(pickDictationCommand(cmds)).toBe('workbench.action.terminal.startDictation')
  })

  it('falls back to a generic dictation command over an editor-only one', () => {
    const cmds = ['workbench.action.editorDictation.start', 'workbench.action.startDictation']
    expect(pickDictationCommand(cmds)).toBe('workbench.action.startDictation')
  })

  it('does NOT match the extension\'s own output-channel command (regression)', () => {
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

  it('still matches real editor/terminal dictation commands', () => {
    expect(pickDictationCommand(['workbench.action.editorDictation.start'])).toBe(
      'workbench.action.editorDictation.start',
    )
  })
})
