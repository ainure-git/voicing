# Security Policy

Voicing runs entirely on your machine: no network calls, no telemetry, no API
keys. Its main security surface is how it hands text to the local voice process.

## Design guarantees

- **No shell injection.** Text is delivered to the TTS process **only** over
  stdin (Base64-encoded on Windows) or as a single isolated `argv` element under
  a no-shell spawn. User text is never interpolated into a command line.
- **Validated numeric arguments** (rate/volume) are clamped in code and, on
  Windows, again in the PowerShell script (`[ValidateRange]`).
- **No temporary files** containing user text.
- **No logging of read content** — only lifecycle diagnostics.

## Reporting a vulnerability

Please **do not** open a public issue for security problems. Instead, use
GitHub's **[Report a vulnerability](https://github.com/ainure-git/voicing/security/advisories/new)**
(Security → Advisories) so it can be handled privately. Include steps to
reproduce and the affected version. We aim to acknowledge within a few days.

## Scope

In scope: command injection, arbitrary code/file execution, orphaned processes,
clipboard mishandling, or any data leaving the machine. Out of scope: issues in
the OS voice engines themselves (SAPI, `say`, `espeak`, `speech-dispatcher`).
