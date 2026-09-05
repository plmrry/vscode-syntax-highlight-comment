import { describe, expect, it } from "vitest";
import {
  clearDiagnosticsForDocument,
  MarkerCodeActionProvider,
  refreshDiagnostics,
  SUPPORTED_DOCUMENT_LANGUAGES,
} from "./diagnostics.js";
import { SUPPORTED_MARKERS } from "./markers.js";
import {
  CodeActionKind,
  Diagnostic,
  DiagnosticSeverity,
  Position,
  Range,
} from "../test-support/vscode-stub.js";

describe("SUPPORTED_DOCUMENT_LANGUAGES", () => {
  it("covers the four JS/TS language ids", () => {
    expect([...SUPPORTED_DOCUMENT_LANGUAGES].sort()).toEqual([
      "javascript",
      "javascriptreact",
      "typescript",
      "typescriptreact",
    ]);
  });
});

describe("refreshDiagnostics", () => {
  it("warns on an unsupported marker before a template literal", () => {
    const text = "const a = /** scss */ `color: red;`;";
    const document = {
      languageId: "typescript",
      uri: "file:///a.ts",
      getText: () => text,
      positionAt: (offset: number) => new Position(0, offset),
    };
    const set: { uri: unknown; diagnostics: Diagnostic[] }[] = [];
    const deleted: unknown[] = [];
    const collection = {
      set: (uri: unknown, diagnostics: Diagnostic[]) =>
        set.push({ uri, diagnostics }),
      delete: (uri: unknown) => deleted.push(uri),
    };

    refreshDiagnostics(document as never, collection as never);

    expect(deleted).toEqual([]);
    expect(set).toHaveLength(1);
    expect(set[0].uri).toBe("file:///a.ts");
    expect(set[0].diagnostics).toHaveLength(1);

    const diagnostic = set[0].diagnostics[0];
    expect(diagnostic.message).toBe(
      'Unsupported template marker "scss". Supported markers: css, html, js, jsx, shell, svg, ts, tsx.',
    );
    expect(diagnostic.severity).toBe(DiagnosticSeverity.Warning);
    expect(diagnostic.code).toBe("unsupported-syntax-highlight-comment-marker");
    expect(diagnostic.source).toBe("vscode-syntax-highlight-comment");
    expect(diagnostic.range.start.character).toBe(text.indexOf("scss"));
    expect(diagnostic.range.end.character).toBe(text.indexOf("scss") + 4);
  });

  it("does not warn on a supported marker", () => {
    const text = "const a = /** css */ `color: red;`;";
    const document = {
      languageId: "typescript",
      uri: "file:///a.ts",
      getText: () => text,
      positionAt: (offset: number) => new Position(0, offset),
    };
    const set: { uri: unknown; diagnostics: Diagnostic[] }[] = [];
    const collection = {
      set: (uri: unknown, diagnostics: Diagnostic[]) =>
        set.push({ uri, diagnostics }),
      delete: () => {},
    };

    refreshDiagnostics(document as never, collection as never);

    expect(set).toHaveLength(1);
    expect(set[0].diagnostics).toEqual([]);
  });

  it("does not warn on a marker alias", () => {
    const text = "const a = /** zsh */ `echo hi`;";
    const document = {
      languageId: "javascript",
      uri: "file:///a.js",
      getText: () => text,
      positionAt: (offset: number) => new Position(0, offset),
    };
    const set: { uri: unknown; diagnostics: Diagnostic[] }[] = [];
    const collection = {
      set: (uri: unknown, diagnostics: Diagnostic[]) =>
        set.push({ uri, diagnostics }),
      delete: () => {},
    };

    refreshDiagnostics(document as never, collection as never);

    expect(set[0].diagnostics).toEqual([]);
  });

  it("ignores a marker comment not followed by a template literal", () => {
    const text = "/** scss */ const a = 1;";
    const document = {
      languageId: "typescript",
      uri: "file:///a.ts",
      getText: () => text,
      positionAt: (offset: number) => new Position(0, offset),
    };
    const set: { uri: unknown; diagnostics: Diagnostic[] }[] = [];
    const collection = {
      set: (uri: unknown, diagnostics: Diagnostic[]) =>
        set.push({ uri, diagnostics }),
      delete: () => {},
    };

    refreshDiagnostics(document as never, collection as never);

    expect(set[0].diagnostics).toEqual([]);
  });

  it("warns on an unsupported marker before a tagged template literal", () => {
    const text = "const a = /** scss */ styled.div`color: red;`;";
    const document = {
      languageId: "typescriptreact",
      uri: "file:///a.tsx",
      getText: () => text,
      positionAt: (offset: number) => new Position(0, offset),
    };
    const set: { uri: unknown; diagnostics: Diagnostic[] }[] = [];
    const collection = {
      set: (uri: unknown, diagnostics: Diagnostic[]) =>
        set.push({ uri, diagnostics }),
      delete: () => {},
    };

    refreshDiagnostics(document as never, collection as never);

    expect(set[0].diagnostics).toHaveLength(1);
    expect(set[0].diagnostics[0].message).toContain('"scss"');
  });

  it("accepts single-star marker comments", () => {
    const text = "const a = /* scss */ `color: red;`;";
    const document = {
      languageId: "typescript",
      uri: "file:///a.ts",
      getText: () => text,
      positionAt: (offset: number) => new Position(0, offset),
    };
    const set: { uri: unknown; diagnostics: Diagnostic[] }[] = [];
    const collection = {
      set: (uri: unknown, diagnostics: Diagnostic[]) =>
        set.push({ uri, diagnostics }),
      delete: () => {},
    };

    refreshDiagnostics(document as never, collection as never);

    expect(set[0].diagnostics).toHaveLength(1);
  });

  it("reports every unsupported marker in a multi-line document", () => {
    const text = [
      "const a = /** scss */ `color: red;`;",
      "const b = /** css */ `color: blue;`;",
      "const c = /** less */ `color: green;`;",
    ].join("\n");
    const document = {
      languageId: "typescript",
      uri: "file:///a.ts",
      getText: () => text,
      positionAt: (offset: number) => {
        const before = text.slice(0, offset);
        const line = before.split("\n").length - 1;
        const character = offset - (before.lastIndexOf("\n") + 1);
        return new Position(line, character);
      },
    };
    const set: { uri: unknown; diagnostics: Diagnostic[] }[] = [];
    const collection = {
      set: (uri: unknown, diagnostics: Diagnostic[]) =>
        set.push({ uri, diagnostics }),
      delete: () => {},
    };

    refreshDiagnostics(document as never, collection as never);

    expect(set[0].diagnostics).toHaveLength(2);
    expect(set[0].diagnostics[0].range.start.line).toBe(0);
    expect(set[0].diagnostics[0].message).toContain('"scss"');
    expect(set[0].diagnostics[1].range.start.line).toBe(2);
    expect(set[0].diagnostics[1].message).toContain('"less"');
  });

  it("returns identical results when called repeatedly", () => {
    const text = "const a = /** scss */ `x`; const b = /** less */ `y`;";
    const document = {
      languageId: "typescript",
      uri: "file:///a.ts",
      getText: () => text,
      positionAt: (offset: number) => new Position(0, offset),
    };
    const set: { uri: unknown; diagnostics: Diagnostic[] }[] = [];
    const collection = {
      set: (uri: unknown, diagnostics: Diagnostic[]) =>
        set.push({ uri, diagnostics }),
      delete: () => {},
    };

    refreshDiagnostics(document as never, collection as never);
    refreshDiagnostics(document as never, collection as never);
    refreshDiagnostics(document as never, collection as never);

    expect(set).toHaveLength(3);
    expect(set[0].diagnostics).toHaveLength(2);
    expect(set[1].diagnostics).toHaveLength(2);
    expect(set[2].diagnostics).toHaveLength(2);
    expect(set[1].diagnostics.map((d) => d.message)).toEqual(
      set[0].diagnostics.map((d) => d.message),
    );
  });

  it("deletes diagnostics for unsupported document languages", () => {
    const document = {
      languageId: "python",
      uri: "file:///a.py",
      getText: () => "x = /** scss */ `color: red;`",
      positionAt: (offset: number) => new Position(0, offset),
    };
    const set: unknown[] = [];
    const deleted: unknown[] = [];
    const collection = {
      set: (uri: unknown) => set.push(uri),
      delete: (uri: unknown) => deleted.push(uri),
    };

    refreshDiagnostics(document as never, collection as never);

    expect(set).toEqual([]);
    expect(deleted).toEqual(["file:///a.py"]);
  });
});

describe("clearDiagnosticsForDocument", () => {
  it("deletes the document's diagnostics", () => {
    const document = {
      languageId: "typescript",
      uri: "file:///a.ts",
      getText: () => "",
      positionAt: (offset: number) => new Position(0, offset),
    };
    const deleted: unknown[] = [];
    const collection = {
      set: () => {},
      delete: (uri: unknown) => deleted.push(uri),
    };

    clearDiagnosticsForDocument(document as never, collection as never);

    expect(deleted).toEqual(["file:///a.ts"]);
  });
});

describe("MarkerCodeActionProvider", () => {
  it("advertises the quick fix kind", () => {
    expect(MarkerCodeActionProvider.providedCodeActionKinds).toEqual([
      CodeActionKind.QuickFix,
    ]);
  });

  it("returns no actions when no diagnostic matches", () => {
    const document = {
      languageId: "typescript",
      uri: "file:///a.ts",
      getText: () => "",
      positionAt: (offset: number) => new Position(0, offset),
    };
    const unrelated = new Diagnostic(
      new Range(new Position(0, 0), new Position(0, 1)),
      "unrelated",
    );
    unrelated.code = "some-other-code";

    const actions = new MarkerCodeActionProvider().provideCodeActions(
      document as never,
      new Range(new Position(0, 0), new Position(0, 1)) as never,
      { diagnostics: [unrelated] } as never,
    );

    expect(actions).toEqual([]);
  });

  it("offers one replacement per supported marker", () => {
    const document = {
      languageId: "typescript",
      uri: "file:///a.ts",
      getText: () => "",
      positionAt: (offset: number) => new Position(0, offset),
    };
    const range = new Range(new Position(0, 14), new Position(0, 18));
    const diagnostic = new Diagnostic(
      range,
      'Unsupported template marker "scss".',
    );
    diagnostic.code = "unsupported-syntax-highlight-comment-marker";

    const actions = new MarkerCodeActionProvider().provideCodeActions(
      document as never,
      range as never,
      { diagnostics: [diagnostic] } as never,
    );

    expect(actions).toHaveLength(SUPPORTED_MARKERS.length);
    expect(actions.map((action) => action.title)).toEqual(
      SUPPORTED_MARKERS.map((marker) => `Replace with "${marker}"`),
    );

    for (const action of actions) {
      expect(action.diagnostics).toEqual([diagnostic]);
      expect(action.kind).toBe(CodeActionKind.QuickFix);
    }

    const cssAction = actions.find(
      (action) => action.title === 'Replace with "css"',
    );
    expect(cssAction?.isPreferred).toBe(true);
    expect(
      actions.filter((action) => action.isPreferred === true),
    ).toHaveLength(1);
  });

  it("edits the diagnostic range with the replacement marker", () => {
    const document = {
      languageId: "typescript",
      uri: "file:///a.ts",
      getText: () => "",
      positionAt: (offset: number) => new Position(0, offset),
    };
    const range = new Range(new Position(0, 14), new Position(0, 18));
    const diagnostic = new Diagnostic(
      range,
      'Unsupported template marker "scss".',
    );
    diagnostic.code = "unsupported-syntax-highlight-comment-marker";

    const actions = new MarkerCodeActionProvider().provideCodeActions(
      document as never,
      range as never,
      { diagnostics: [diagnostic] } as never,
    );

    const htmlAction = actions.find(
      (action) => action.title === 'Replace with "html"',
    );
    if (!htmlAction) {
      throw new Error('missing "html" quick fix action');
    }

    const edit = htmlAction.edit as unknown as { replacements: unknown[] };
    expect(edit.replacements).toEqual([
      { uri: "file:///a.ts", range, newText: "html" },
    ]);
  });

  it("offers actions for each matching diagnostic", () => {
    const document = {
      languageId: "typescript",
      uri: "file:///a.ts",
      getText: () => "",
      positionAt: (offset: number) => new Position(0, offset),
    };
    const first = new Diagnostic(
      new Range(new Position(0, 14), new Position(0, 18)),
      "first",
    );
    first.code = "unsupported-syntax-highlight-comment-marker";
    const second = new Diagnostic(
      new Range(new Position(1, 14), new Position(1, 18)),
      "second",
    );
    second.code = "unsupported-syntax-highlight-comment-marker";

    const actions = new MarkerCodeActionProvider().provideCodeActions(
      document as never,
      new Range(new Position(0, 0), new Position(1, 0)) as never,
      { diagnostics: [first, second] } as never,
    );

    expect(actions).toHaveLength(SUPPORTED_MARKERS.length * 2);
  });
});
