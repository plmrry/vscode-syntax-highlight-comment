export class Position {
  constructor(
    public readonly line: number,
    public readonly character: number,
  ) {}
}

export class Range {
  constructor(
    public readonly start: Position,
    public readonly end: Position,
  ) {}
}

export const DiagnosticSeverity = {
  Error: 0,
  Warning: 1,
  Information: 2,
  Hint: 3,
} as const;

export class Diagnostic {
  code: string | undefined;
  source: string | undefined;

  constructor(
    public readonly range: Range,
    public readonly message: string,
    public readonly severity?: number,
  ) {}
}

export const CodeActionKind = {
  QuickFix: { value: "quickfix" },
} as const;

export class WorkspaceEdit {
  readonly replacements: { uri: unknown; range: Range; newText: string }[] = [];

  replace(uri: unknown, range: Range, newText: string): void {
    this.replacements.push({ uri, range, newText });
  }
}

export class CodeAction {
  edit: WorkspaceEdit | undefined;
  diagnostics: Diagnostic[] | undefined;
  isPreferred: boolean | undefined;

  constructor(
    public readonly title: string,
    public readonly kind?: unknown,
  ) {}
}
