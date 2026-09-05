# Syntax Highlighting in VS Code: TextMate, Semantic Tokens, and Tree-sitter

Research notes gathered 2026-09-05. Context: this extension injects TextMate
grammars into JS/TS template literals based on a preceding marker comment
(`/** css */`). These notes cover how that approach compares to the
alternatives, and what has changed upstream.

## The three tokenization systems

VS Code has three distinct mechanisms that can color a range of text. They are
not really alternatives so much as layers.

- **TextMate grammars** — the baseline engine
  - Structured collections of Oniguruma regular expressions, authored as plist
    (XML) or JSON.
  - Contributed by extensions through the `grammars` contribution point.
  - Runs in the renderer process; tokens update synchronously as the user
    types.
  - Produces not just colors but the *classification* VS Code relies on
    elsewhere — comment, string, and regex regions feed bracket matching,
    comment toggling, and autosuggest behavior.
  - Purely lexical: no semantic understanding of the program.
- **Semantic token providers** — added in VS Code 1.43
  - An extension (usually backed by a language server) returns tokens as
    ranges plus a type and modifiers, encoded in a compact numeric array.
  - Uses a dedicated type/modifier vocabulary rather than TextMate scopes.
  - Resolves symbols project-wide: a constant is colored as a constant at every
    use site, not only at its declaration. Same for parameters, properties,
    class names.
  - Asynchronous. Arrives after TextMate highlighting, once analysis completes.
- **Native tree-sitter tokenization** — shipping in VS Code core, opt-in
  - Real incremental parse trees instead of a regex stack.
  - Gated behind per-language settings (see the rollout section below).

### How the layers merge

- Semantic tokens are merged on top of TextMate tokens, and semantic tokens
  win where they overlap.
- Language and standard token classification (string, regex, comment) remains
  the TextMate grammar's job even when semantic highlighting is active.
- `editor.semanticHighlighting.enabled` toggles the semantic layer, globally or
  per language.
- Themes must opt in with `"semanticHighlighting": true`. Out of the box only
  the built-in themes show semantic colors.
- When a theme has no rule for a semantic token type, VS Code falls back by
  mapping that type to TextMate scopes and applying the theme's TextMate rules.
  Extensions can supply their own fallbacks via the `semanticTokenScopes`
  contribution point.
- Debugging: `Developer: Inspect Editor Tokens and Scopes` shows which system
  produced the color at the cursor.

## Grammar injection (what this extension does)

- Declared with a `scopeName` plus an `injectTo` array naming host scopes
  (e.g. `source.js`, `source.ts`), optionally with `embeddedLanguages` and
  `tokenTypes` maps.
- The canonical use case is exactly this one: embedding a foreign language
  inside strings or comments of a host language you do not own — SQL in JS
  template strings, CSS in styled-components, and so on.
- Composable in a way semantic tokens are not
  - Many extensions can inject into the same host scope simultaneously.
  - Only one semantic token provider can be active per document, and there is
    no mechanism to "inject" into JavaScript's existing provider. Owning the
    JS/TS semantic provider is not an option for a third-party extension.
- Known constraints worth remembering
  - You cannot inject directly into an already-captured token; the content of
    `begin`/`end` rules differs, so you must replace and re-handle the token
    you want to modify.
  - If the host language ships semantic highlighting, its semantic tokens can
    override injected TextMate colors, and there is often no workaround short
    of rewriting large parts of that extension.

### Why injection remains the right call for a marker-comment extension

- Synchronous, so highlighting appears with the first paint rather than after
  a language server round trip.
- Composes with whatever else the user has installed.
- Requires no parser, no WASM payload, no ABI pinning, and no per-language
  fork.
- Users and themes can override scopes with plain JSON.

## TextMate's real limitations

These are the constraints that motivate the tree-sitter push, and they are
worth knowing precisely rather than as folklore.

- **Patterns cannot span lines.** A single expression cannot embrace multiple
  lines. A regex that works in a regex tester will silently fail in a grammar
  if it depends on `\n`. Lookarounds are the escape hatch — Oniguruma has
  unrestricted positive and negative lookarounds, useful for disambiguating two
  patterns that match the same text by their surroundings — but lookarounds
  also cannot cross line boundaries.
- **Arbitrary nesting depth is not expressible.** The model is a stack of
  begin/end rules with nested `patterns`, but a regex cannot count nesting, so
  matching the *correct* closing delimiter for a recursively nested construct
  is not possible. Nested template literals are the standard example, and a
  contributor on the VS Code tree-sitter issue described it as something they
  had wanted to fix in TextMate for months and could not.
- **Silent failure.** A bad regex does not error; it just never matches. This
  is the single largest source of wasted debugging time.
- **Escaping noise.** Every backslash is doubled inside JSON strings, so a
  literal backslash (`\\` in regex) becomes `\\\\` in the grammar file.
- **Maintainability at scale.** VS Code's own docs concede that a growing
  grammar becomes difficult to understand and maintain as JSON, and suggest
  authoring in YAML for multi-line strings and comments, then converting —
  VS Code itself loads only JSON. The 500+ issues filed against Microsoft's
  own `TypeScript-TmLanguage` repo are the usual evidence cited for the
  authoring burden.
- **Performance is on the UI thread.** Tokenization runs in the renderer
  process as the user types, so pathological backtracking stalls the editor
  directly. Mitigation: `\G` anchors a match exactly where the previous match
  ended, which is valuable when a grammar carves a document into contiguous
  scopes.

This repository generates its grammar from `scripts/build-grammar.mjs` rather
than hand-editing JSON, which is the standard mitigation for the escaping and
maintainability problems above.

## Tree-sitter

### What it actually is

- An incremental parser that builds a full concrete syntax tree, making it
  context-aware in ways a regex stack cannot be.
- Incremental re-parsing on edit keeps it fast enough for as-you-type use.
- Highlighting is expressed as *queries* — S-expression patterns in `.scm`
  files that capture nodes and assign them names.
- Adopted by Atom (now defunct), Emacs, Neovim, Zed, Helix, Lapce, and
  Sublime's tree-sitter plugin.

### Injection queries (the tree-sitter equivalent of what this extension does)

- The model is a parent syntax tree plus injected trees living inside specific
  parent nodes. Standard cases: JS in HTML `<script>`, CSS in `<style>`, Ruby
  in ERB, HTML outside `<?php`, JS regex literals, Ruby heredocs whose
  delimiter names the language.
- For tagged template literals specifically, the idiom is:
  - match a `tagged_template_expression`
  - test the tag identifier with a predicate such as `#eq?` or `#any-of?`
  - capture the `template_string` body as `@injection.content`
  - set the language with `(#set! injection.language "css")`
- Neovim specifics
  - Queries live at `queries/<lang>/injections.scm` under `runtimepath`; the
    first match on `runtimepath` wins, so use the `;extends` modeline to add to
    the bundled queries rather than replace them.
  - A `LanguageTree` holds the root parser plus injected parsers, which can
    themselves inject recursively.
  - Capture priority is set with `#set! priority <number>`, which is how
    conflicts against injected or inherited queries get resolved.
  - Gotcha that mirrors the VS Code situation exactly: an LSP's
    `semanticTokensProvider` can override tree-sitter injection highlights, and
    disabling semantic tokens restores them.
  - `dariuscorvus/tree-sitter-language-injection.nvim` does approximately what
    this extension does — injects based on an inline or above-line comment
    annotation naming the language.
- Zed specifics
  - `injections.scm` per language, with the same capture and directive
    vocabulary as Neovim, so queries port with minor changes.
  - Internally a `SyntaxMap` holds a collection of syntax trees per buffer with
    multi-language injection support.
  - Grammars are pinned in `extension.toml` by `repository` plus `rev`.
- Cross-editor takeaway: one set of injection queries is largely portable
  across Neovim, Zed, Helix, and Sublime. TextMate grammars are similarly
  portable across TextMate, VS Code, and Sublime Text. Neither is portable to
  the other camp.

### Tree-sitter in VS Code core

- Native tree-sitter tokenization exists in VS Code and is opt-in per language.
- Settings graduated out of the experimental namespace in
  microsoft/vscode#245350, which renamed
  - `editor.experimental.preferTreeSitter.<lang>` to
    `editor.preferTreeSitter.<lang>`
  - `editor.experimental.treeSitterTelemetry` to `editor.treeSitterTelemetry`
  - Migration handlers auto-rename old settings, covering all five tree-sitter
    settings.
- CSS was among the first languages tested (microsoft/vscode#244445, March
  2025). The team explicitly accepted regressions: the old CSS TextMate grammar
  hardcoded deprecated tokens that tree-sitter will not reproduce, so some
  things previously shown in red no longer are.
- Practical note: configure with `editor.preferTreeSitter.<lang>` today
  (`css`, `typescript`, `regex`, `ini` have appeared in discussion).

### Third-party tree-sitter extensions

All of these work by registering a *semantic token provider* — VS Code does not
natively consume third-party tree-sitter highlight queries, so the Semantic
Tokens API is the only available bridge.

- `AlecGhost.tree-sitter-vscode` — config-driven, bring your own parser.
  - `tree-sitter-vscode.languageConfigs` takes `lang`, `parser` (path to a
    `tree-sitter-xyz.wasm`), `highlights`, `injections`, and
    `semanticTokenTypeMappings`.
  - Supports highlights, injections, and folds queries. Injection queries can
    name the target language either by the capture name (Neovim convention) or
    via `#set!`.
  - Stated motivation is the gap this extension also lives in: TextMate is
    regex-based and cannot represent most languages fully, a full language
    server is a lot of work, and tree-sitter is the middle ground.
- `galexite.vscode-tree-sitter` ("Syntax Highlighter") — batteries included.
  - WebAssembly bindings to tree-sitter, all parsers compiled to `.wasm`.
  - Overrides TextMate coloring via the Semantic Token API, and follows the
    active theme provided the theme enables `semanticHighlighting`. Otherwise
    force it with `editor.semanticTokenColorCustomizations`.
- `71/vscode-tree-sitter-api` — exposes parsers and queries to *other*
  extensions.
  - Handles WASM module loading, language detection, and tree caching.
  - Offers `with*` helpers so WASM objects do not have to be manually
    `.delete()`d, with `documentTree()` and `query()` available for manual
    management.
  - Work in progress, unpublished, API subject to change.
- `jrieken.vscode-tree-sitter-query` — from a VS Code team member; tooling for
  authoring `.scm` query files.
- `jeff-hykin.experimental-tree-sitter` and the deprecated
  `georgewfraser.vscode-tree-sitter` are the earlier attempts in this space.

### Practical gotchas when shipping a WASM grammar

- **ABI version is the most common failure.** Parsers must be generated with
  ABI 14 or 15: `tree-sitter generate --abi 15` then `tree-sitter build --wasm`.
- Building requires the Emscripten SDK, though `tree-sitter build --wasm` will
  pull an Emscripten Docker image automatically if Docker is available.
- WSL is recommended on Windows.
- WASM objects require manual deallocation unless wrapped.

## Why VS Code has been slow to replace TextMate

The maintainers' objections from the long-running issue, which are more
substantive than "not invented here":

- Tree-sitter grammars are arguably *too* granular for the theming system. They
  describe everything about every node, while themes are far coarser about what
  they color.
- The tree-sitter scope to semantic token mapping is lossy. C++ has 400+
  TextMate token types; one tree-sitter extension supported roughly eight.
- VS Code uses TextMate scopes internally for non-color decisions such as
  autosuggestion behavior.
- Third-party tree-sitter extensions run *on top of* the TextMate engine, so
  they are strictly less efficient than TextMate alone.
- Extensibility regresses. Today any extension can add or override a grammar
  with JSON. Changing a tree-sitter highlight can mean writing a subset of
  Scheme and modifying a third-party grammar, and adding a language to a
  monolithic tree-sitter extension requires forking it.
- Ecosystem inertia: TextMate support means far less work porting between
  TextMate, VS Code, and Sublime Text.

## Decision guidance

- Use an **injection grammar** for embedded or DSL content inside strings or
  comments of a host language you do not own. This is this extension's case,
  and remains correct.
- Use a **semantic token provider** when you own the language and have a parser
  or language server that can resolve symbols.
- Use **tree-sitter via a semantic token provider** when you need real parsing
  for a language VS Code does not cover well, and you accept the WASM payload,
  the ABI pinning, the single-provider-per-document limit, and the loss of
  synchronous first paint.
- Watch `editor.preferTreeSitter.<lang>` as it expands. If JS/TS tokenization
  eventually moves to native tree-sitter, injection behavior for template
  literals is the thing to re-verify — that is the migration risk for this
  extension.

## Sources

- [Syntax Highlight Guide — VS Code API](https://code.visualstudio.com/api/language-extensions/syntax-highlight-guide)
- [Semantic Highlight Guide — VS Code API](https://code.visualstudio.com/api/language-extensions/semantic-highlight-guide)
- [Semantic Highlighting Overview — vscode wiki](https://github.com/microsoft/vscode/wiki/Semantic-Highlighting-Overview)
- [Support syntax highlighting with tree-sitter — microsoft/vscode#50140](https://github.com/microsoft/vscode/issues/50140)
- [Migrate away from `*.experimental.*` tree sitter settings — microsoft/vscode#245350](https://github.com/microsoft/vscode/pull/245350)
- [Test tree-sitter support for CSS — microsoft/vscode#244445](https://github.com/microsoft/vscode/issues/244445)
- [Injection grammar extension — vscode-discussions#152](https://github.com/microsoft/vscode-discussions/discussions/152)
- [microsoft/vscode-textmate — DeepWiki](https://deepwiki.com/microsoft/vscode-textmate)
- [AlecGhost/tree-sitter-vscode](https://github.com/AlecGhost/tree-sitter-vscode)
- [tree-sitter-vscode — Marketplace](https://marketplace.visualstudio.com/items?itemName=AlecGhost.tree-sitter-vscode)
- [galexite/vscode-tree-sitter](https://github.com/galexite/vscode-tree-sitter)
- [71/vscode-tree-sitter-api](https://github.com/71/vscode-tree-sitter-api)
- [vscode-tree-sitter-query — Marketplace](https://marketplace.visualstudio.com/items?itemName=jrieken.vscode-tree-sitter-query)
- [jeff-hykin/experimental-tree-sitter](https://github.com/jeff-hykin/experimental-tree-sitter)
- [Treesitter — Neovim docs](https://neovim.io/doc/user/treesitter/)
- [Language Extensions — Zed docs](https://zed.dev/docs/extensions/languages)
- [Language Support and Tree-sitter — zed-industries/zed DeepWiki](https://deepwiki.com/zed-industries/zed/5.3-language-support-and-tree-sitter)
- [DariusCorvus/tree-sitter-language-injection.nvim](https://github.com/DariusCorvus/tree-sitter-language-injection.nvim)
- [Embedded SQL highlighting in Neovim](https://sitr.us/2026/05/03/embedded-sql-highlighting-in-neovim/)
- [Language Grammars — TextMate 1.x Manual](https://macromates.com/manual/en/language_grammars)
- [Writing a language grammar (TextMate) in Atom — Aerijo](https://gist.github.com/Aerijo/b8c82d647db783187804e86fa0a604a1)
- [Writing a TextMate Grammar: Some Lessons Learned](https://www.apeth.com/nonblog/stories/textmatebundle.html)
- [Tree-sitter: How Incremental Parsing Works](https://tomassetti.me/incremental-parsing-using-tree-sitter/)
