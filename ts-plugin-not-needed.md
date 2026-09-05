# Why there is no TypeScript server plugin

This extension used to ship a TypeScript Language Service Plugin
(`internal-ts-plugin`) that stripped semantic classifications for marked
template literal ranges. It was removed. Do not add it back.

## The problem it claimed to solve does not exist

The stated justification was that TypeScript's semantic tokens override
TextMate scopes in JS/TS files, and would therefore repaint the contents of a
marked template literal as plain string/template-string tokens, hiding the
injected grammar.

That is not how VS Code's TypeScript integration works. Reading the semantic
token provider in VS Code's bundled `typescript-language-features` extension:

- The semantic token legend contains only identifier-shaped types:
  - `class`, `enum`, `interface`, `namespace`, `typeParameter`, `type`,
    `parameter`, `variable`, `enumMember`, `property`, `function`, `method`.
  - There is no `string`, `templateString`, or `comment` type, so semantic
    tokens are structurally incapable of coloring template literal text.
- The provider requests classifications in `format: "2020"` and discards
  anything that is not a resolvable identifier:
  - TypeScript encodes 2020-format identifiers as
    `(tokenType + 1) << 8 | modifiers`.
  - The provider decodes with `if (value > 255) return (value >> 8) - 1`, and
    skips the token when that returns `undefined`.
  - Legacy classifications such as `stringLiteral` and `comment` are small
    integers, fall below 255, and are dropped before reaching the editor.

So the injected grammar was never being painted over, and the plugin's filter
was pure overhead.

## It also made things worse

The only tokens inside a marked template that TypeScript does classify are
identifiers in `${...}` interpolations. The plugin stripped those, so
interpolated expressions lost their correct JS/TS coloring and fell back to
whatever the embedded grammar said.

## It is incompatible with TypeScript 7 regardless

TypeScript 7 (the native `tsgo` build) does not implement the tsserver
language service plugin API — its `lib/` ships no `typescript.js` language
service at all. With TypeScript 7 enabled, VS Code refuses the contribution
outright:

```
TypeScript server plugins from the "paul-murray.vscode-syntax-highlight-comment"
extension will not be loaded because TypeScript 7 is enabled globally.
```

## What was removed

- The `internal-ts-plugin/` package.
- The `typescriptServerPlugins` contribution in `package.json`.
- The `internal-ts-plugin` `file:` dependency in `package.json`.
- The `node_modules/internal-ts-plugin` entry in `package.json`'s `files`.
- `.npmrc`, which existed only to set `install-links=true` so `npm install`
  would copy rather than symlink the plugin into `node_modules`.
- The plugin's hand-maintained `KNOWN_MARKERS` duplicate of `src/markers.ts`,
  which was a third copy of the marker list alongside
  `scripts/build-grammar.mjs`.

## If highlighting looks wrong

The cause is scope precedence in the injection grammar, not semantic tokens.
Fix it in `scripts/build-grammar.mjs` and regenerate. Note also that VS Code
skips semantic tokens entirely for documents over 100,000 characters — if
highlighting differs between large and small files, that limit is the reason,
and it is unrelated to this extension.

## Rejected alternative: editor decorations

Painting template literal contents from the extension host with
`createTextEditorDecorationType` renders above both TextMate and semantic
tokens, but this repo ships only the injection grammar and references VS
Code's built-in `css`/`html`/`shell`/`svg`/`js`/`jsx`/`ts`/`tsx` grammars by
scope name. Reproducing their coloring would require bundling
`vscode-textmate` plus `vscode-oniguruma`, bundling every embedded language
grammar, and resolving per-token colors against the active theme with no clean
public API. Not worth it, and not needed.
