# Contributing to Voicing

Thanks for helping! Contributions of all sizes are welcome — bug reports, docs,
and especially **macOS/Linux testing reports**.

## Ways to help

- 🐛 **Report a bug** — open an issue with your OS, editor + version, and steps.
- 🧪 **Test on macOS/Linux** — the POSIX engines are implemented but not yet
  verified on real hardware. Use the *Platform test report* issue template.
- 💡 **Suggest a feature** — keep it focused; Voicing aims to stay small and solid.
- 🔧 **Send a PR** — see below.

## Development setup

```bash
npm ci
npm run typecheck && npm run lint && npm test   # all quality gates
node esbuild.js                                  # dev bundle (or --production)
```

Press `F5` in VS Code to launch an Extension Development Host, or build a `.vsix`:

```bash
npx vsce package --no-dependencies
```

## Ground rules

- **TypeScript strict, no `any`.** Keep pure logic free of the `vscode` API so it
  stays unit-testable (see `src/textProcessing`, `src/tts/*`, `src/selection/core.ts`).
- **Add tests** for new logic. The suite runs under Jest with a `vscode` mock.
- **Security:** never pass user text through a shell. Text reaches the voice
  process only via stdin (Base64 on Windows) or as an isolated argv element.
- **Privacy:** never send text anywhere and never log the text being read.
- Run all four gates before opening a PR: `typecheck`, `lint`, `test`, and a
  production build.

## Commit style

Conventional-ish: `type(scope): description` (e.g. `fix(tts): …`, `docs: …`).

## Releasing

Bump `version` in `package.json`, update `CAMBIOS.md`, then push a tag
`vX.Y.Z`. The release workflow builds the `.vsix` and attaches it to a GitHub
Release. See [.github/workflows/release.yml](.github/workflows/release.yml).
