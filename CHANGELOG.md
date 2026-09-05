# Changelog

## Unreleased

- Fix local VSIX packaging after the grammar generator rename, exclude tests from the package, and move Marketplace publishing to `npm run publish-extension`.
- Remove the experimental semantic token fallback (`src/regions.ts`, `src/semantic-tokens.ts`, `src/tokenizers.ts`) and the `syntaxHighlightComment.semanticTokens.enable` setting. Highlighting is TextMate grammar injection only.
- Document that `editor.experimental.preferTreeSitter` is not supported: with it enabled for a targeted language, VS Code ignores injected TextMate grammars and marked template literals go unhighlighted.
- Remove the bundled TypeScript language service plugin. VS Code's semantic token legend contains no string or template-string type, and its provider discards every non-identifier classification before it reaches the editor, so TypeScript was never painting over the injected grammar. The plugin only stripped semantic coloring from interpolated expressions, and could not load at all under TypeScript 7. See `ts-plugin-not-needed.md`.

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
