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

export class SemanticTokensLegend {
  constructor(
    public readonly tokenTypes: string[],
    public readonly tokenModifiers: string[] = [],
  ) {}
}

export class SemanticTokens {
  constructor(
    public readonly data: Uint32Array,
    public readonly resultId?: string,
  ) {}
}

export class SemanticTokensBuilder {
  public static instances: SemanticTokensBuilder[] = [];

  public readonly pushed: Array<{
    line: number;
    character: number;
    length: number;
    tokenType: number;
    tokenModifiers: number;
  }> = [];

  constructor(public readonly legend?: SemanticTokensLegend) {
    SemanticTokensBuilder.instances.push(this);
  }

  push(
    line: number,
    character: number,
    length: number,
    tokenType: number,
    tokenModifiers: number,
  ): void {
    this.pushed.push({ line, character, length, tokenType, tokenModifiers });
  }

  build(resultId?: string): SemanticTokens {
    const data = new Uint32Array(this.pushed.length * 5);
    let previousLine = 0;
    let previousCharacter = 0;

    this.pushed.forEach((token, index) => {
      const deltaLine = token.line - previousLine;
      const deltaCharacter =
        deltaLine === 0 ? token.character - previousCharacter : token.character;
      data.set(
        [
          deltaLine,
          deltaCharacter,
          token.length,
          token.tokenType,
          token.tokenModifiers,
        ],
        index * 5,
      );
      previousLine = token.line;
      previousCharacter = token.character;
    });

    return new SemanticTokens(data, resultId);
  }
}

export const workspace = {
  configurationValues: new Map<string, unknown>(),
  getConfiguration(section: string) {
    const values = workspace.configurationValues;
    return {
      get<T>(key: string, defaultValue: T): T {
        const value = values.get(`${section}.${key}`);
        return value === undefined ? defaultValue : (value as T);
      },
    };
  },
};
