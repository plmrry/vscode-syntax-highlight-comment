# Changelog

## Unreleased

- Re-add the bundled TypeScript language service plugin (`vscode-syntax-highlight-comment-ts-plugin`), which suppresses semantic classification inside marked template literals so the injected grammar's highlighting isn't painted over. It's now wired up as a real `file:` dependency (resolved by `npm install` via `install-links=true` in `.npmrc`) instead of a hand-rolled `postinstall`/`prebuild` copy script.

## 2026.9.3

- Add `svg` marker support for SVG-highlighted template literals.
- Update dependencies.

## 2026.6.29

- Add `jsx`/`javascriptreact`, `ts`/`typescript`, and `tsx`/`typescriptreact` marker support for JavaScript React, TypeScript, and TypeScript React-highlighted template literals.

## 2026.5.30

- Add `js`/`javascript` marker support for JavaScript-highlighted template literals.

## 2026.2.280054

- Improve template interpolation highlighting inside marker templates.
- Parse `${...}` expressions using the host document grammar (`$base`) so embedded expressions are highlighted as JavaScript/TypeScript/JSX/TSX appropriately.

## 0.1.0

- Initial release.
- Add comment-marker template literal highlighting for:
  - `css`
  - `html`
  - `shell` (including `sh`, `bash`, `zsh`, `shellscript`)
- Add diagnostics + quick fixes for unsupported markers in JS/TS files.
