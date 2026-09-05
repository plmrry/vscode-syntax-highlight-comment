# `internal-ts-plugin`

This documents the TypeScript Language Service Plugin that ships with this
extension.

## Why it exists

VS Code colors JS/TS from two independent layers:

- **TextMate grammar** (this extension's `syntaxes/syntax-highlight-comment.tmLanguage.json`) — injects `css`/`html`/`shell` grammars into template literal bodies preceded by a recognized marker comment.
- **TypeScript semantic tokens** — the TS language service also classifies tokens (via `getEncodedSemanticClassifications`/`getSemanticClassifications`), and VS Code layers those on top of, and usually overriding, TextMate scopes in `.ts`/`.tsx`/`.js`/`.jsx` files.

Because semantic tokens take priority, TypeScript would recolor the _contents_ of a marked template literal as plain string/template-string tokens, hiding the injected grammar. The plugin removes semantic classifications for the byte ranges covered by marked template literals, so the TextMate injection is what the user actually sees.

The grammar contribution's `tokenTypes: "other"` mapping in `package.json` does **not** solve this — that field only controls `standardTokenType` inference (bracket matching, auto-closing, and similar language-configuration behaviors), not semantic-highlighting suppression. There is no config-level fix; suppressing TS's semantic classifications for a range requires code running inside the TS server, i.e. a language service plugin.

See `ts-plugin-alternative.md` for the decoration-based alternative that was considered and rejected.

## How it's wired up

- `package.json` declares it as a `typescriptServerPlugins` contribution:

  ```json
  "typescriptServerPlugins": [
    {
      "name": "internal-ts-plugin",
      "enableForWorkspaceTypeScriptVersions": true
    }
  ]
  ```

  `enableForWorkspaceTypeScriptVersions: true` makes it also load into a workspace's own `typescript` install (not just VS Code's bundled TS).

- TS server plugins are resolved from `node_modules` by name. The source at `internal-ts-plugin/` is a real npm package, declared as a normal `file:` dependency in `package.json`'s `dependencies`:

  ```json
  "dependencies": {
    "internal-ts-plugin": "file:internal-ts-plugin"
  }
  ```

  `.npmrc` sets `install-links=true` so `npm install` materializes this as a real copy inside `node_modules/internal-ts-plugin` (not a symlink) — a symlink would break when the packaged `.vsix` is installed on someone else's machine, since the symlink target (`../../internal-ts-plugin`) wouldn't exist for them.

- `package.json`'s `files` array includes `node_modules/internal-ts-plugin` explicitly, so the resolved plugin package ships inside the packaged `.vsix`.
- No custom copy script is needed — `npm install` alone populates `node_modules` correctly, which is what `npm run build`/`package` and CI already run.

## How the plugin works internally (`internal-ts-plugin/index.js`)

It's a standard `ts-server-plugin` module exporting `init()` → `{ create(info) }`. `create` wraps the real `languageService` in a proxy:

1. **Pass through everything** by default — every method on `languageService` is copied to the proxy, functions rebound to the original `this`.
2. **Find marked template ranges** — `findMarkedTemplateRanges(text)` re-implements (independently of `src/diagnostics.ts`) the "marker comment directly before a template literal" scan:
   - A regex matches a `/** marker */` or `/* marker */` comment immediately followed by an optional tag expression and a backtick.
   - If the captured marker (lowercased) is in a hardcoded `KNOWN_MARKERS` set, it walks forward from the opening backtick, skipping `\`-escaped characters, to find the matching closing backtick.
   - This produces a list of `[start, end]` character offsets for each marked template literal's full text (including the backticks).
3. **Overrides the two classification entry points**:
   - `getEncodedSemanticClassifications(fileName, span, format)` — the fast, encoded-triples form (`[start, length, classificationType, start, length, classificationType, ...]`). The plugin calls the original, then drops any triple whose `[start, start+length)` range overlaps a marked-template range.
   - `getSemanticClassifications(fileName, span)` — the older array-of-objects form. Same filtering logic, applied to `classification.textSpan`.
   - Both look up ranges via `getMarkedRanges(fileName)`, which pulls the `ts.SourceFile` from the language service's `Program` and re-scans its full text (`sourceFile.getFullText()`) on every call — there is no caching.
4. An interval-overlap helper (`start < rangeEnd && end > rangeStart`) checks each token span against all marked ranges.

Net effect: TypeScript still computes semantic tokens for the rest of the file normally, but any token whose span falls inside a marked template literal is stripped from the result, leaving the TextMate injection grammar as the only thing coloring that span.

## Known duplication

`internal-ts-plugin/index.js`'s `KNOWN_MARKERS` set is a hand-maintained duplicate of the alias map in `src/markers.ts` — the plugin is a separate npm package and can't import TypeScript source from the main extension. This mirrors an existing pattern already in the repo: `scripts/build-grammar.mjs` also maintains its own independent list of supported markers/scopes rather than importing from `src/markers.ts`. Keep all three in sync when adding/removing marker types.
