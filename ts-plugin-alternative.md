# Alternatives considered to the TS server plugin

`ts-plugin.md` describes the current approach: a TypeScript Language Service
Plugin that strips semantic classifications for marked template ranges so
the TextMate injection grammar shows through. This records the alternatives
considered before settling on that approach (packaged as a real `file:`
dependency, per `ts-plugin.md`).

## Rejected: `tokenTypes` grammar contribution

`package.json`'s grammar contribution already sets
`tokenTypes: "other"` for each embedded scope. This looks like it might
suppress semantic-highlighting override, but it doesn't — per VS Code's own
docs, `tokenTypes` only controls `standardTokenType` inference (bracket
matching, auto-closing, and similar language-configuration behaviors that
get disabled for scopes classified as `string`/`comment`/`regex`). There is
no config-level fix for the semantic-token-override problem.

## Rejected: editor decorations, no TS plugin at all

The idea: paint the marked template literal contents directly from the
extension host using `vscode.window.createTextEditorDecorationType`, since
decorations render on top of both TextMate and semantic token coloring —
no need to intercept TS's classification calls at all.

This was rejected once the real scope became clear. This repo only ships
the _injection_ grammar (`syntaxes/syntax-highlight-comment.tmLanguage.json`)
and references VS Code's built-in `css`/`html`/`shell`/`svg`/`js`/`jsx`/`ts`/`tsx`
grammars by scope name — it does not ship those grammars itself. To
reproduce their coloring via decorations would require:

- Bundling a TextMate tokenizer (`vscode-textmate` + `vscode-oniguruma`)
  in-process.
- Bundling the actual grammar files for every supported embedded language
  (css, html, shell/bash, svg/xml, js, jsx, ts, tsx) — none of which this
  repo currently has.
- Resolving per-token colors against the user's active color theme, which
  has no clean public extension API.

That's a multi-day subsystem with its own theme/version-drift maintenance
burden — a worse tradeoff than the TS plugin it was meant to replace.

## Decision

Keep the TS server plugin, but fix its actual packaging problem: it used to
require a hand-rolled `postinstall`/`prebuild` script to copy `internal-ts-plugin/`
into `node_modules` so TS server's name-based plugin resolution could find
it. Declaring it as a real `file:` dependency (with `install-links=true` in
`.npmrc` so `npm install` copies rather than symlinks it) gets the same
result with no custom script. See `ts-plugin.md` for the resulting setup.
