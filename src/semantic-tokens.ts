import * as vscode from "vscode";
import { findEmbeddedRegions, maskInterpolations } from "./regions.js";
import {
  SEMANTIC_TOKEN_TYPES,
  type SemanticTokenType,
  tokenize,
} from "./tokenizers.js";

export const SEMANTIC_TOKENS_LEGEND = new vscode.SemanticTokensLegend([
  ...SEMANTIC_TOKEN_TYPES,
]);

export const SEMANTIC_TOKENS_SELECTOR: vscode.DocumentSelector = [
  { language: "typescript" },
  { language: "typescriptreact" },
];

export const CONFIG_SECTION = "syntaxHighlightComment";
export const CONFIG_ENABLE_SEMANTIC_TOKENS = "semanticTokens.enable";

export class EmbeddedSemanticTokensProvider
  implements vscode.DocumentSemanticTokensProvider
{
  provideDocumentSemanticTokens(
    document: vscode.TextDocument,
  ): vscode.SemanticTokens | undefined {
    if (!isEnabled()) {
      return undefined;
    }

    const text = document.getText();
    const regions = findEmbeddedRegions(text);

    if (regions.length === 0) {
      return undefined;
    }

    const builder = new vscode.SemanticTokensBuilder(SEMANTIC_TOKENS_LEGEND);

    for (const region of regions) {
      const body = maskInterpolations(text, region.start, region.end);

      for (const token of tokenize(region.language, body)) {
        pushToken(
          builder,
          document,
          region.start + token.start,
          token.length,
          token.type,
        );
      }
    }

    return builder.build();
  }
}

function isEnabled(): boolean {
  return vscode.workspace
    .getConfiguration(CONFIG_SECTION)
    .get<boolean>(CONFIG_ENABLE_SEMANTIC_TOKENS, false);
}

export function pushToken(
  builder: vscode.SemanticTokensBuilder,
  document: vscode.TextDocument,
  offset: number,
  length: number,
  type: SemanticTokenType,
): void {
  const typeIndex = SEMANTIC_TOKEN_TYPES.indexOf(type);

  if (typeIndex === -1 || length <= 0) {
    return;
  }

  const start = document.positionAt(offset);
  const end = document.positionAt(offset + length);

  if (start.line === end.line) {
    builder.push(start.line, start.character, length, typeIndex, 0);
    return;
  }

  for (let line = start.line; line <= end.line; line += 1) {
    const lineLength = document.lineAt(line).text.length;
    const character = line === start.line ? start.character : 0;
    const lineEnd = line === end.line ? end.character : lineLength;
    const segmentLength = lineEnd - character;

    if (segmentLength > 0) {
      builder.push(line, character, segmentLength, typeIndex, 0);
    }
  }
}
