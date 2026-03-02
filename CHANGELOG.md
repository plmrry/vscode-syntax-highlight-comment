# Changelog

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
