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

  it('matches voice-based command ids', () => {
    expect(pickDictationCommand(['some.voice.command'])).toBe('some.voice.command')
  })
})
