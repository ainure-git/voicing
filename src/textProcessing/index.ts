/**
 * Orchestrates the full text-processing pipeline, turning raw terminal output
 * into clean, chunked, speakable text.
 */

import { TerminalVoiceConfig } from '../types'
import { effectiveCodeBlockMode } from '../config'
import { stripAnsi, stripControlChars, stripTerminalDecorations } from './ansi'
import { handleCodeBlocks } from './codeBlocks'
import { markdownToText } from './markdown'
import { improvePronunciation } from './pronunciation'
import { truncate, chunkText } from './chunk'

/** Max characters per TTS chunk. Keeps each SpeakAsync call responsive. */
export const CHUNK_LENGTH = 1200

export interface ProcessResult {
  /** The final cleaned text (post-truncation). */
  text: string
  /** True if the input exceeded the configured maximum and was truncated. */
  truncated: boolean
  /** Speakable chunks derived from `text`. */
  chunks: string[]
}

/** Collapses excess blank lines and repeated spaces into readable prose. */
export function collapseWhitespace(input: string): string {
  return input
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]*\n/g, '\n')
    .trim()
}

/** Runs the whole cleaning pipeline for a given configuration. */
export function processText(raw: string, config: TerminalVoiceConfig): ProcessResult {
  let text = stripAnsi(raw)
  text = stripControlChars(text)
  text = stripTerminalDecorations(text)
  text = handleCodeBlocks(text, effectiveCodeBlockMode(config))
  text = markdownToText(text)
  text = improvePronunciation(text)
  text = collapseWhitespace(text)

  const { text: truncated, truncated: wasTruncated } = truncate(text, config.maxCharacters)
  const chunks = chunkText(truncated, CHUNK_LENGTH)

  return { text: truncated, truncated: wasTruncated, chunks }
}
