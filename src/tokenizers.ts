import type { SupportedMarker } from "./markers.js";

export const SEMANTIC_TOKEN_TYPES = [
  "comment",
  "string",
  "number",
  "keyword",
  "operator",
  "variable",
  "parameter",
  "property",
  "type",
  "function",
  "class",
] as const;

export type SemanticTokenType = (typeof SEMANTIC_TOKEN_TYPES)[number];

export interface RawToken {
  start: number;
  length: number;
  type: SemanticTokenType;
}

interface ScannerRule {
  pattern: string;
  type: SemanticTokenType;
}

function createScanner(rules: ScannerRule[]): (text: string) => RawToken[] {
  const source = rules.map((rule) => `(${rule.pattern})`).join("|");

  return (text: string) => {
    const regex = new RegExp(source, "g");
    const tokens: RawToken[] = [];

    let match = regex.exec(text);

    while (match) {
      if (match[0].length === 0) {
        regex.lastIndex += 1;
        match = regex.exec(text);
        continue;
      }

      for (let index = 0; index < rules.length; index += 1) {
        if (match[index + 1] !== undefined) {
          tokens.push({
            start: match.index,
            length: match[0].length,
            type: rules[index].type,
          });
          break;
        }
      }

      match = regex.exec(text);
    }

    return tokens;
  };
}

const SCRIPT_KEYWORDS = [
  "abstract",
  "as",
  "asserts",
  "async",
  "await",
  "break",
  "case",
  "catch",
  "class",
  "const",
  "continue",
  "declare",
  "default",
  "delete",
  "do",
  "else",
  "enum",
  "export",
  "extends",
  "false",
  "finally",
  "for",
  "from",
  "function",
  "get",
  "if",
  "implements",
  "import",
  "in",
  "infer",
  "instanceof",
  "interface",
  "is",
  "keyof",
  "let",
  "namespace",
  "new",
  "null",
  "of",
  "private",
  "protected",
  "public",
  "readonly",
  "return",
  "satisfies",
  "set",
  "static",
  "super",
  "switch",
  "this",
  "throw",
  "true",
  "try",
  "type",
  "typeof",
  "undefined",
  "var",
  "void",
  "while",
  "yield",
];

const SCRIPT_TYPES = [
  "any",
  "bigint",
  "boolean",
  "never",
  "number",
  "object",
  "string",
  "symbol",
  "unknown",
];

const SHELL_KEYWORDS = [
  "break",
  "case",
  "continue",
  "declare",
  "do",
  "done",
  "elif",
  "else",
  "esac",
  "exit",
  "export",
  "fi",
  "for",
  "function",
  "if",
  "in",
  "local",
  "readonly",
  "return",
  "set",
  "shift",
  "then",
  "trap",
  "until",
  "while",
];

const SHELL_COMMANDS = [
  "awk",
  "cat",
  "cd",
  "cp",
  "curl",
  "echo",
  "git",
  "grep",
  "ls",
  "mkdir",
  "mv",
  "node",
  "npm",
  "print",
  "printf",
  "pwd",
  "rm",
  "sed",
  "source",
  "test",
  "tr",
];

const scanCss = createScanner([
  { pattern: "/\\*[\\s\\S]*?\\*/", type: "comment" },
  { pattern: "\"(?:[^\"\\\\]|\\\\.)*\"|'(?:[^'\\\\]|\\\\.)*'", type: "string" },
  { pattern: "@[-\\w]+", type: "keyword" },
  { pattern: "#[0-9a-fA-F]{3,8}\\b", type: "number" },
  { pattern: "!\\s*important\\b", type: "keyword" },
  { pattern: "--[-\\w]+", type: "variable" },
  { pattern: "[-a-zA-Z_][-\\w]*(?=\\s*:(?![:-]))", type: "property" },
  { pattern: "[-\\w]+(?=\\()", type: "function" },
  { pattern: "[-+]?(?:\\d*\\.\\d+|\\d+)(?:[a-zA-Z%]+)?", type: "number" },
  { pattern: "::?[-\\w]+", type: "class" },
  { pattern: "[.#][-\\w]+", type: "class" },
  { pattern: "\\[[^\\]]*\\]", type: "property" },
  { pattern: "[-a-zA-Z_][-\\w]*", type: "variable" },
]);

const scanMarkup = createScanner([
  { pattern: "<!--[\\s\\S]*?-->", type: "comment" },
  { pattern: "<![^>]*>", type: "keyword" },
  { pattern: "<\\?[\\s\\S]*?\\?>", type: "keyword" },
  { pattern: "\"(?:[^\"\\\\]|\\\\.)*\"|'[^']*'", type: "string" },
  { pattern: "(?<=</?)[A-Za-z_][-\\w:.]*", type: "type" },
  { pattern: "[A-Za-z_][-\\w:.]*(?=\\s*=)", type: "property" },
  { pattern: "&(?:#\\d+|#x[0-9a-fA-F]+|\\w+);", type: "number" },
  { pattern: "</|/>|[<>]", type: "operator" },
]);

const scanShell = createScanner([
  { pattern: "#![^\\n]*", type: "comment" },
  { pattern: "(?<=^|\\s)#[^\\n]*", type: "comment" },
  { pattern: "\"(?:[^\"\\\\]|\\\\.)*\"|'[^']*'", type: "string" },
  {
    pattern: "\\$\\{[^}]*\\}|\\$[A-Za-z_]\\w*|\\$[@*#?$!0-9-]",
    type: "variable",
  },
  { pattern: `\\b(?:${SHELL_KEYWORDS.join("|")})\\b`, type: "keyword" },
  { pattern: `\\b(?:${SHELL_COMMANDS.join("|")})\\b`, type: "function" },
  { pattern: "(?<=\\s)-{1,2}[A-Za-z][-\\w]*", type: "parameter" },
  { pattern: "\\b\\d+\\b", type: "number" },
  { pattern: "\\|\\||&&|>>|<<|[|&;<>]", type: "operator" },
]);

const scanScript = createScanner([
  { pattern: "//[^\\n]*", type: "comment" },
  { pattern: "/\\*[\\s\\S]*?\\*/", type: "comment" },
  {
    pattern:
      "\"(?:[^\"\\\\\\n]|\\\\.)*\"|'(?:[^'\\\\\\n]|\\\\.)*'|`(?:[^`\\\\]|\\\\.)*`",
    type: "string",
  },
  {
    pattern:
      "\\b(?:0[xX][0-9a-fA-F]+|0[bB][01]+|0[oO][0-7]+|\\d+n|(?:\\d+\\.?\\d*|\\.\\d+)(?:[eE][-+]?\\d+)?)\\b",
    type: "number",
  },
  { pattern: `\\b(?:${SCRIPT_KEYWORDS.join("|")})\\b`, type: "keyword" },
  { pattern: `\\b(?:${SCRIPT_TYPES.join("|")})\\b`, type: "type" },
  { pattern: "[A-Za-z_$][\\w$]*(?=\\s*\\()", type: "function" },
  { pattern: "(?<=\\.)[A-Za-z_$][\\w$]*", type: "property" },
  { pattern: "\\b[A-Z][\\w$]*\\b", type: "class" },
  { pattern: "[A-Za-z_$][\\w$]*", type: "variable" },
  { pattern: "=>|\\.{3}|[=+\\-*/%<>!&|^~?:]+", type: "operator" },
]);

const SCANNERS: Record<SupportedMarker, (text: string) => RawToken[]> = {
  css: scanCss,
  html: scanMarkup,
  svg: scanMarkup,
  shell: scanShell,
  js: scanScript,
  jsx: scanScript,
  ts: scanScript,
  tsx: scanScript,
};

export function tokenize(language: SupportedMarker, text: string): RawToken[] {
  const scanner = SCANNERS[language];
  return scanner ? scanner(text) : [];
}
