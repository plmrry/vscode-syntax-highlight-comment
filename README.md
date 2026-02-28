# vscode-syntax-highlight-comment

Syntax highlight template literals in JavaScript and TypeScript by placing a comment immediately before the backtick.

## Supported markers

- `/** css */`
- `/** html */`
- `/** shell */`
- Shell aliases: `/** sh */`, `/** bash */`, `/** zsh */`, `/** shellscript */`

## Example

```ts
const foo = /** css */ `.div { color: green }`;
const qux = /** css */ styleFn`.btn { color: green }`;
const bar = /** html */ `<div>haha</div>`;
const baz = /** shell */ `pnpm run install`;
```

## How it works

- The extension injects a TextMate grammar into JS/TS scopes.
- Each marker maps the template literal content to an embedded language:
  - `css` -> `css`
  - `html` -> `html`
  - `shell` -> `shellscript`
- Diagnostics warn on unsupported markers and include quick fixes.

## Development

- Install dependencies: `pnpm install`
- Build grammar + extension: `pnpm run build`
- Start extension dev host from VS Code: `F5`

## Notes

- Marker comment must be directly before the template literal (or its tag expression), optionally with whitespace in between.
- Basic `${...}` interpolation is supported inside marked template literals.
