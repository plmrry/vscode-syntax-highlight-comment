import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const rootDir = resolve(import.meta.dirname, "..");
const outputFile = resolve(
	rootDir,
	"syntaxes",
	"syntax-highlight-comment.tmLanguage.json",
);

const templates = [
	{
		key: "css",
		markerRegex: "css",
		embeddedScope: "meta.embedded.block.syntax-highlight-comment.css",
		includeScope: "source.css",
	},
	{
		key: "html",
		markerRegex: "html",
		embeddedScope: "meta.embedded.block.syntax-highlight-comment.html",
		includeScope: "text.html.basic",
	},
	{
		key: "shell",
		markerRegex: "shell|shellscript|sh|bash|zsh",
		embeddedScope: "meta.embedded.block.syntax-highlight-comment.shell",
		includeScope: "source.shell",
	},
];

function createTemplateRule(template) {
	return {
		name: `meta.template-literal.syntax-highlight-comment.${template.key}`,
		begin: `(\\/\\*\\*?\\s*(?:${template.markerRegex})\\s*\\*\\/)(\\s*)(\`)`,
		beginCaptures: {
			1: {
				name: "comment.block.documentation.js",
			},
			3: {
				name: "punctuation.definition.string.template.begin.js",
			},
		},
		end: "(?<!\\\\)`",
		endCaptures: {
			0: {
				name: "punctuation.definition.string.template.end.js",
			},
		},
		contentName: template.embeddedScope,
		patterns: [
			{
				include: "#template-interpolation",
			},
			{
				include: template.includeScope,
			},
		],
	};
}

const repository = {
	"template-interpolation": {
		name: "meta.template.expression.js",
		begin: "\\$\\{",
		beginCaptures: {
			0: {
				name: "punctuation.definition.template-expression.begin.js",
			},
		},
		end: "\\}",
		endCaptures: {
			0: {
				name: "punctuation.definition.template-expression.end.js",
			},
		},
		patterns: [
			{
				include: "source.ts",
			},
			{
				include: "source.js",
			},
		],
	},
};

for (const template of templates) {
	repository[`${template.key}-template`] = createTemplateRule(template);
}

const grammar = {
	$schema:
		"https://raw.githubusercontent.com/martinring/tmlanguage/master/tmlanguage.json",
	name: "Syntax Highlight Comment Injection",
	scopeName: "syntax-highlight-comment.injection",
	injectionSelector:
		"L:source.js -comment -string, L:source.js.jsx -comment -string, L:source.ts -comment -string, L:source.tsx -comment -string",
	patterns: templates.map((template) => ({
		include: `#${template.key}-template`,
	})),
	repository,
};

await mkdir(resolve(rootDir, "syntaxes"), { recursive: true });
await writeFile(outputFile, `${JSON.stringify(grammar, null, 2)}\n`, "utf8");

console.log(`Wrote ${outputFile}`);
