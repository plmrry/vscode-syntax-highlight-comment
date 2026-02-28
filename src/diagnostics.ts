import * as vscode from "vscode";
import {
	resolveMarker,
	SUPPORTED_MARKER_LIST,
	SUPPORTED_MARKERS,
} from "./markers.js";

const COMMENT_MARKER_PATTERN = /\/\*\*?\s*([a-zA-Z][\w-]*)\s*\*\/(?=\s*`)/g;
const DIAGNOSTIC_CODE = "unsupported-syntax-highlight-comment-marker";

export const SUPPORTED_DOCUMENT_LANGUAGES = new Set([
	"javascript",
	"javascriptreact",
	"typescript",
	"typescriptreact",
]);

export function refreshDiagnostics(
	document: vscode.TextDocument,
	diagnostics: vscode.DiagnosticCollection,
): void {
	if (!SUPPORTED_DOCUMENT_LANGUAGES.has(document.languageId)) {
		diagnostics.delete(document.uri);
		return;
	}

	const text = document.getText();
	const foundDiagnostics: vscode.Diagnostic[] = [];

	let match = COMMENT_MARKER_PATTERN.exec(text);
	while (match) {
		const fullMatch = match[0];
		const marker = match[1];
		const resolvedMarker = resolveMarker(marker);

		if (!resolvedMarker) {
			const markerOffset = match.index + fullMatch.indexOf(marker);
			const range = new vscode.Range(
				document.positionAt(markerOffset),
				document.positionAt(markerOffset + marker.length),
			);
			const diagnostic = new vscode.Diagnostic(
				range,
				`Unsupported template marker "${marker}". Supported markers: ${SUPPORTED_MARKER_LIST}.`,
				vscode.DiagnosticSeverity.Warning,
			);
			diagnostic.code = DIAGNOSTIC_CODE;
			diagnostic.source = "vscode-syntax-highlight-comment";
			foundDiagnostics.push(diagnostic);
		}

		match = COMMENT_MARKER_PATTERN.exec(text);
	}

	diagnostics.set(document.uri, foundDiagnostics);
}

export function clearDiagnosticsForDocument(
	document: vscode.TextDocument,
	diagnostics: vscode.DiagnosticCollection,
): void {
	diagnostics.delete(document.uri);
}

export class MarkerCodeActionProvider implements vscode.CodeActionProvider {
	public static readonly providedCodeActionKinds = [
		vscode.CodeActionKind.QuickFix,
	];

	provideCodeActions(
		document: vscode.TextDocument,
		_range: vscode.Range,
		context: vscode.CodeActionContext,
	): vscode.CodeAction[] {
		const matchingDiagnostics = context.diagnostics.filter(
			(diagnostic) => diagnostic.code === DIAGNOSTIC_CODE,
		);

		if (matchingDiagnostics.length === 0) {
			return [];
		}

		const actions: vscode.CodeAction[] = [];

		for (const diagnostic of matchingDiagnostics) {
			for (const marker of SUPPORTED_MARKERS) {
				const action = new vscode.CodeAction(
					`Replace with "${marker}"`,
					vscode.CodeActionKind.QuickFix,
				);
				action.edit = new vscode.WorkspaceEdit();
				action.edit.replace(document.uri, diagnostic.range, marker);
				action.diagnostics = [diagnostic];
				action.isPreferred = marker === "css";
				actions.push(action);
			}
		}

		return actions;
	}
}
