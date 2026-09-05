import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { MARKER_ALIASES, SUPPORTED_MARKERS } from "../src/markers.ts";

const rootDir = resolve(import.meta.dirname, "..");
const outputFile = resolve(
  rootDir,
  "syntaxes",
  "syntax-highlight-comment.tmLanguage.json",
);

const INCLUDE_SCOPES = {
  css: "source.css",
  html: "text.html.basic",
  js: "source.js",
  jsx: "source.js.jsx",
  shell: "source.shell",
  svg: "text.xml",
  ts: "source.ts",
  tsx: "source.tsx",
};

const templates = SUPPORTED_MARKERS.map((marker) => {
  const includeScope = INCLUDE_SCOPES[marker];

  if (!includeScope) {
    throw new Error(
      `No TextMate include scope for marker "${marker}". Add it to INCLUDE_SCOPES in scripts/build-syntaxes.mts.`,
    );
  }

  return {
    key: marker,
    markerRegex: MARKER_ALIASES[marker].join("|"),
    embeddedScope: `meta.embedded.block.syntax-highlight-comment.${marker}`,
    includeScope,
  };
});

function createTemplateRule(template) {
  return {
    name: `meta.template-literal.syntax-highlight-comment.${template.key}`,
    begin: `(\\/\\*\\*?\\s*(?:${template.markerRegex})\\s*\\*\\/)(\\s*(?:[A-Za-z_$][\\w$]*(?:\\.[A-Za-z_$][\\w$]*)*\\s*)?)(\`)`,
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
        include: "$base",
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
  scopeName: "source.syntax-highlight-comment.injection",
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
