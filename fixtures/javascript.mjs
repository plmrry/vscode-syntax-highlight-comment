{
  const _css = /* css */ `
  .foo {
    color: red;
    background: url("bar.png");
  }
`;

  const _html = /* html */ `
  <div class="foo">
    <span data-x="1">hello</span>
  </div>
`;

  const _js = /* js */ `
  const foo = 'bar';
  function baz(n) {
    return n * 2;
  }
`;

  const _javascript = /* javascript */ `
  export default async function main() {
    await Promise.resolve(1);
  }
`;

  const _jsx = /* jsx */ `
  const App = () => <div className="app">{value}</div>;
`;

  const _javascriptreact = /* javascriptreact */ `
  function Item({ label }) {
    return <li title={label}>{label}</li>;
  }
`;

  const _shell = /* shell */ `
  set -euo pipefail
  echo "hello" | tr a-z A-Z
`;

  const _shellscript = /* shellscript */ `
  #!/usr/bin/env bash
  for f in *.txt; do
    cat "$f"
  done
`;

  const _sh = /* sh */ `
  ls -la /tmp
`;

  const _bash = /* bash */ `
  if [[ -f package.json ]]; then
    npm ci
  fi
`;

  const _zsh = /* zsh */ `
  print -r -- "${"$"}{PWD}"
`;

  const _svg = /* svg */ `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" />
  </svg>
`;

  const _ts = /* ts */ `
  interface Foo { bar: string }
  const foo: Foo = { bar: 'baz' };
`;

  const _typescript = /* typescript */ `
  type Maybe<T> = T | undefined;
  const value: Maybe<number> = 42;
`;

  const _tsx = /* tsx */ `
  const Button = ({ label }: { label: string }) => <button>{label}</button>;
`;

  const _typescriptreact = /* typescriptreact */ `
  function List<T>({ items }: { items: T[] }) {
    return <ul>{items.map((i) => <li>{String(i)}</li>)}</ul>;
  }
`;

  const _docblockMarker = /** css */ `
  .doc-comment-marker {
    display: grid;
  }
`;

  const color = "red";

  const _interpolation = /* css */ `
  .interpolated {
    color: ${color};
    padding: ${1 + 2}px;
  }
`;

  const _tagged = /* css */ String.raw`
  .tagged {
    margin: 0;
  }
`;
}
