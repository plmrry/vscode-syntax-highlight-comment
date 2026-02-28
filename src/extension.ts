import * as vscode from "vscode";
import {
  clearDiagnosticsForDocument,
  MarkerCodeActionProvider,
  refreshDiagnostics,
  SUPPORTED_DOCUMENT_LANGUAGES,
} from "./diagnostics.js";
import { SUPPORTED_MARKER_LIST } from "./markers.js";

const COMMAND_SHOW_SUPPORTED_MARKERS =
  "syntaxHighlightComment.showSupportedMarkers";

const LANGUAGE_SELECTOR: vscode.DocumentSelector = [
  { language: "javascript" },
  { language: "javascriptreact" },
  { language: "typescript" },
  { language: "typescriptreact" },
];

export function activate(context: vscode.ExtensionContext): void {
  const diagnostics = vscode.languages.createDiagnosticCollection(
    "syntax-highlight-comment",
  );
  context.subscriptions.push(diagnostics);

  for (const document of vscode.workspace.textDocuments) {
    refreshDiagnostics(document, diagnostics);
  }

  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument((document) => {
      refreshDiagnostics(document, diagnostics);
    }),
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      refreshDiagnostics(event.document, diagnostics);
    }),
  );

  context.subscriptions.push(
    vscode.workspace.onDidCloseTextDocument((document) => {
      clearDiagnosticsForDocument(document, diagnostics);
    }),
  );

  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(
      LANGUAGE_SELECTOR,
      new MarkerCodeActionProvider(),
      {
        providedCodeActionKinds:
          MarkerCodeActionProvider.providedCodeActionKinds,
      },
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      COMMAND_SHOW_SUPPORTED_MARKERS,
      async () => {
        const activeEditor = vscode.window.activeTextEditor;
        const languageHint =
          activeEditor &&
          SUPPORTED_DOCUMENT_LANGUAGES.has(activeEditor.document.languageId)
            ? `Detected language: ${activeEditor.document.languageId}.`
            : "Open a JS/TS file to use marker diagnostics.";

        await vscode.window.showInformationMessage(
          `Supported comment markers: ${SUPPORTED_MARKER_LIST}. ${languageHint}`,
        );
      },
    ),
  );
}

export function deactivate(): void {}
