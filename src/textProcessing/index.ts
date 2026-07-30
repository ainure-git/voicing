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

/**
 * Slack added to maxCharacters for the pre-pass bound. Cleaning only ever
 * shrinks text, so pre-slicing the raw input to (max + slack) before the regex
 * passes guarantees the heavy processing never runs on unbounded input, while
 * leaving enough margin that the final clean cut still lands at maxCharacters.
 */
export const PRE_TRUNCATE_SLACK = 4000

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
  // Bound the input BEFORE the regex passes so huge pastes never freeze the
  // extension host. Cleaning can only shrink text, so this cannot cut content
  // that would otherwise have survived the final truncation.
  const bound = config.maxCharacters + PRE_TRUNCATE_SLACK
  const preSliced = raw.length > bound
  let text = preSliced ? raw.slice(0, bound) : raw

  text = stripAnsi(text)
  text = stripControlChars(text)
  text = stripTerminalDecorations(text)
  text = handleCodeBlocks(text, effectiveCodeBlockMode(config))
  text = markdownToText(text)
  text = improvePronunciation(text)
  text = collapseWhitespace(text)

  const { text: truncated, truncated: wasTruncated } = truncate(text, config.maxCharacters)
  const chunks = chunkText(truncated, CHUNK_LENGTH)

  return { text: truncated, truncated: wasTruncated || preSliced, chunks }
}
