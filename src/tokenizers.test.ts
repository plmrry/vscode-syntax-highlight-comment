import { describe, expect, it } from "vitest";
import { SEMANTIC_TOKEN_TYPES, type RawToken, tokenize } from "./tokenizers.js";
import { SUPPORTED_MARKERS } from "./markers.js";

function typeOf(tokens: RawToken[], text: string, needle: string): string[] {
  const start = text.indexOf(needle);
  return tokens
    .filter((token) => token.start === start && token.length === needle.length)
    .map((token) => token.type);
}

describe("tokenize", () => {
  it("has a scanner for every supported marker", () => {
    for (const marker of SUPPORTED_MARKERS) {
      expect(tokenize(marker, "x").length).toBeGreaterThanOrEqual(0);
    }
  });

  it("emits only token types present in the legend", () => {
    const samples = {
      css: ".a { color: red; }",
      html: "<p class='x'>hi</p>",
      svg: "<circle cx='1' />",
      shell: "if [[ -f x ]]; then echo hi; fi",
      js: "const a = foo(1);",
      jsx: "const a = foo(1);",
      ts: "const a: string = foo(1);",
      tsx: "const a: string = foo(1);",
    } as const;

    for (const marker of SUPPORTED_MARKERS) {
      for (const token of tokenize(marker, samples[marker])) {
        expect(SEMANTIC_TOKEN_TYPES).toContain(token.type);
      }
    }
  });

  it("never emits overlapping or out-of-order tokens", () => {
    const text = ".a { color: #fff; margin: 0 auto; }\n/* note */";
    const tokens = tokenize("css", text);

    for (let index = 1; index < tokens.length; index += 1) {
      const previous = tokens[index - 1];
      expect(tokens[index].start).toBeGreaterThanOrEqual(
        previous.start + previous.length,
      );
    }
  });

  it("never emits a token outside the input", () => {
    const text = "const a = 1;";
    for (const token of tokenize("ts", text)) {
      expect(token.start).toBeGreaterThanOrEqual(0);
      expect(token.start + token.length).toBeLessThanOrEqual(text.length);
    }
  });
});

describe("css scanner", () => {
  const text =
    '.foo:hover { color: #fff; width: 10px; background: url("a.png"); /* c */ }';
  const tokens = tokenize("css", text);

  it("classifies a class selector", () => {
    expect(typeOf(tokens, text, ".foo")).toEqual(["class"]);
  });

  it("classifies a pseudo selector", () => {
    expect(typeOf(tokens, text, ":hover")).toEqual(["class"]);
  });

  it("classifies a property name", () => {
    expect(typeOf(tokens, text, "color")).toEqual(["property"]);
  });

  it("classifies a hex colour as a number", () => {
    expect(typeOf(tokens, text, "#fff")).toEqual(["number"]);
  });

  it("classifies a dimension as a number", () => {
    expect(typeOf(tokens, text, "10px")).toEqual(["number"]);
  });

  it("classifies a function name", () => {
    expect(typeOf(tokens, text, "url")).toEqual(["function"]);
  });

  it("classifies a quoted value as a string", () => {
    expect(typeOf(tokens, text, '"a.png"')).toEqual(["string"]);
  });

  it("classifies a comment", () => {
    expect(typeOf(tokens, text, "/* c */")).toEqual(["comment"]);
  });

  it("classifies an at-rule as a keyword", () => {
    const media = "@media (min-width: 1px) { .a {} }";
    expect(typeOf(tokenize("css", media), media, "@media")).toEqual([
      "keyword",
    ]);
  });

  it("classifies a custom property as a variable", () => {
    const custom = ".a { --brand: red; }";
    expect(typeOf(tokenize("css", custom), custom, "--brand")).toEqual([
      "variable",
    ]);
  });
});

describe("shell scanner", () => {
  const text = 'if [[ -f x ]]; then echo "$HOME" | tr a-z A-Z; fi # done';
  const tokens = tokenize("shell", text);

  it("classifies a keyword", () => {
    expect(typeOf(tokens, text, "if")).toEqual(["keyword"]);
  });

  it("classifies a command", () => {
    expect(typeOf(tokens, text, "echo")).toEqual(["function"]);
  });

  it("classifies a flag as a parameter", () => {
    expect(typeOf(tokens, text, "-f")).toEqual(["parameter"]);
  });

  it("classifies a quoted string", () => {
    expect(typeOf(tokens, text, '"$HOME"')).toEqual(["string"]);
  });

  it("classifies a trailing comment", () => {
    expect(typeOf(tokens, text, "# done")).toEqual(["comment"]);
  });

  it("classifies a bare variable", () => {
    const bare = "echo $HOME and ${PATH}";
    const bareTokens = tokenize("shell", bare);
    expect(typeOf(bareTokens, bare, "$HOME")).toEqual(["variable"]);
    expect(typeOf(bareTokens, bare, "${PATH}")).toEqual(["variable"]);
  });

  it("classifies a shebang as a comment", () => {
    const shebang = "#!/usr/bin/env bash\necho hi";
    expect(
      typeOf(tokenize("shell", shebang), shebang, "#!/usr/bin/env bash"),
    ).toEqual(["comment"]);
  });
});

describe("markup scanner", () => {
  const text = '<div class="a"><!-- c --><span>hi</span></div>';
  const tokens = tokenize("html", text);

  it("classifies a tag name as a type", () => {
    expect(typeOf(tokens, text, "div")).toEqual(["type"]);
  });

  it("classifies an attribute name as a property", () => {
    expect(typeOf(tokens, text, "class")).toEqual(["property"]);
  });

  it("classifies an attribute value as a string", () => {
    expect(typeOf(tokens, text, '"a"')).toEqual(["string"]);
  });

  it("classifies a comment", () => {
    expect(typeOf(tokens, text, "<!-- c -->")).toEqual(["comment"]);
  });

  it("classifies a self-closing svg tag", () => {
    const svg = '<circle cx="1" fill="none" />';
    const svgTokens = tokenize("svg", svg);
    expect(typeOf(svgTokens, svg, "circle")).toEqual(["type"]);
    expect(typeOf(svgTokens, svg, "cx")).toEqual(["property"]);
  });
});

describe("script scanner", () => {
  const text =
    "const foo: string = bar.baz(1); // note\ninterface Shape { n: number }";
  const tokens = tokenize("ts", text);

  it("classifies a keyword", () => {
    expect(typeOf(tokens, text, "const")).toEqual(["keyword"]);
  });

  it("classifies a primitive type", () => {
    expect(typeOf(tokens, text, "string")).toEqual(["type"]);
  });

  it("classifies a call target as a function", () => {
    expect(typeOf(tokens, text, "baz")).toEqual(["function"]);
  });

  it("classifies a member access as a property", () => {
    const member = "a.value";
    expect(typeOf(tokenize("ts", member), member, "value")).toEqual([
      "property",
    ]);
  });

  it("classifies a capitalised identifier as a class", () => {
    expect(typeOf(tokens, text, "Shape")).toEqual(["class"]);
  });

  it("classifies a number", () => {
    expect(typeOf(tokens, text, "1")).toEqual(["number"]);
  });

  it("classifies a line comment", () => {
    expect(typeOf(tokens, text, "// note")).toEqual(["comment"]);
  });

  it("classifies a string", () => {
    const quoted = "const a = 'x';";
    expect(typeOf(tokenize("js", quoted), quoted, "'x'")).toEqual(["string"]);
  });

  it("does not classify a keyword substring inside an identifier", () => {
    const identifier = "const constant = 1;";
    const identifierTokens = tokenize("ts", identifier);
    expect(typeOf(identifierTokens, identifier, "constant")).toEqual([
      "variable",
    ]);
  });
});
