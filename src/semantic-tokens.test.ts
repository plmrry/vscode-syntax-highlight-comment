import { beforeEach, describe, expect, it } from "vitest";
import * as vscode from "vscode";
import {
  CONFIG_ENABLE_SEMANTIC_TOKENS,
  CONFIG_SECTION,
  EmbeddedSemanticTokensProvider,
  SEMANTIC_TOKENS_LEGEND,
  SEMANTIC_TOKENS_SELECTOR,
  pushToken,
} from "./semantic-tokens.js";
import { SEMANTIC_TOKEN_TYPES } from "./tokenizers.js";

function createDocument(text: string) {
  const lines = text.split("\n");

  return {
    getText: () => text,
    positionAt: (offset: number) => {
      let remaining = Math.max(0, Math.min(offset, text.length));
      for (let line = 0; line < lines.length; line += 1) {
        if (remaining <= lines[line].length) {
          return new vscode.Position(line, remaining);
        }
        remaining -= lines[line].length + 1;
      }
      const last = lines.length - 1;
      return new vscode.Position(last, lines[last].length);
    },
    lineAt: (line: number) => ({ text: lines[line] }),
  } as unknown as vscode.TextDocument;
}

function setEnabled(enabled: boolean): void {
  (
    vscode as unknown as {
      workspace: { configurationValues: Map<string, unknown> };
    }
  ).workspace.configurationValues.set(
    `${CONFIG_SECTION}.${CONFIG_ENABLE_SEMANTIC_TOKENS}`,
    enabled,
  );
}

function tokensOf(text: string) {
  const provider = new EmbeddedSemanticTokensProvider();
  const document = createDocument(text);
  const result = provider.provideDocumentSemanticTokens(document);
  return { result, document };
}

function pushedFor(text: string) {
  const builders = (
    vscode.SemanticTokensBuilder as unknown as {
      instances: Array<{
        pushed: Array<{
          line: number;
          character: number;
          length: number;
          tokenType: number;
        }>;
      }>;
    }
  ).instances;

  builders.length = 0;

  new EmbeddedSemanticTokensProvider().provideDocumentSemanticTokens(
    createDocument(text),
  );

  return builders.flatMap((builder) => builder.pushed);
}

describe("EmbeddedSemanticTokensProvider", () => {
  beforeEach(() => {
    setEnabled(true);
  });

  it("targets only the TypeScript languages", () => {
    expect(SEMANTIC_TOKENS_SELECTOR).toEqual([
      { language: "typescript" },
      { language: "typescriptreact" },
    ]);
  });

  it("exposes a legend matching the tokenizer token types", () => {
    expect(SEMANTIC_TOKENS_LEGEND.tokenTypes).toEqual([
      ...SEMANTIC_TOKEN_TYPES,
    ]);
  });

  it("returns undefined when the setting is disabled", () => {
    setEnabled(false);
    const { result } = tokensOf("const a = /* css */ `.foo { color: red; }`;");

    expect(result).toBeUndefined();
  });

  it("returns undefined when the document has no marked regions", () => {
    const { result } = tokensOf("const a = `.foo {}`;");

    expect(result).toBeUndefined();
  });

  it("returns tokens when the document has a marked region", () => {
    const { result } = tokensOf("const a = /* css */ `.foo { color: red; }`;");

    expect(result).toBeDefined();
    expect(result?.data.length).toBeGreaterThan(0);
    expect(result?.data.length % 5).toBe(0);
  });

  it("emits tokens positioned inside the template body only", () => {
    const text = "const a = /* css */ `.foo { color: red; }`;";
    const pushed = pushedFor(text);
    const bodyStart = text.indexOf("`") + 1;
    const bodyEnd = text.lastIndexOf("`");

    expect(pushed.length).toBeGreaterThan(0);

    for (const token of pushed) {
      expect(token.line).toBe(0);
      expect(token.character).toBeGreaterThanOrEqual(bodyStart);
      expect(token.character + token.length).toBeLessThanOrEqual(bodyEnd);
    }
  });

  it("emits tokens for every region in the document", () => {
    const text = [
      "const a = /* css */ `.a { color: red; }`;",
      "const b = /* shell */ `echo hi`;",
    ].join("\n");
    const pushed = pushedFor(text);

    expect(new Set(pushed.map((token) => token.line))).toEqual(new Set([0, 1]));
  });

  it("does not emit tokens inside an interpolation", () => {
    const text = "const a = /* css */ `.a { color: ${theColor}; }`;";
    const pushed = pushedFor(text);
    const holeStart = text.indexOf("${");
    const holeEnd = text.indexOf("}", holeStart) + 1;

    for (const token of pushed) {
      const overlaps =
        token.character < holeEnd && token.character + token.length > holeStart;
      expect(overlaps).toBe(false);
    }
  });

  it("uses token type indexes that exist in the legend", () => {
    const pushed = pushedFor("const a = /* css */ `.a { color: red; }`;");

    for (const token of pushed) {
      expect(token.tokenType).toBeGreaterThanOrEqual(0);
      expect(token.tokenType).toBeLessThan(SEMANTIC_TOKEN_TYPES.length);
    }
  });
});

describe("pushToken", () => {
  it("pushes a single token when it fits on one line", () => {
    const document = createDocument("abc def");
    const builder = new vscode.SemanticTokensBuilder(SEMANTIC_TOKENS_LEGEND);

    pushToken(builder, document, 4, 3, "variable");

    expect((builder as unknown as { pushed: unknown[] }).pushed).toEqual([
      {
        line: 0,
        character: 4,
        length: 3,
        tokenType: SEMANTIC_TOKEN_TYPES.indexOf("variable"),
        tokenModifiers: 0,
      },
    ]);
  });

  it("splits a token that spans multiple lines", () => {
    const document = createDocument("ab\ncdef\ngh");
    const builder = new vscode.SemanticTokensBuilder(SEMANTIC_TOKENS_LEGEND);

    pushToken(builder, document, 1, 8, "comment");

    expect(
      (
        builder as unknown as {
          pushed: Array<{ line: number; character: number; length: number }>;
        }
      ).pushed.map(({ line, character, length }) => ({
        line,
        character,
        length,
      })),
    ).toEqual([
      { line: 0, character: 1, length: 1 },
      { line: 1, character: 0, length: 4 },
      { line: 2, character: 0, length: 1 },
    ]);
  });

  it("ignores a zero-length token", () => {
    const document = createDocument("abc");
    const builder = new vscode.SemanticTokensBuilder(SEMANTIC_TOKENS_LEGEND);

    pushToken(builder, document, 0, 0, "variable");

    expect((builder as unknown as { pushed: unknown[] }).pushed).toEqual([]);
  });
});
