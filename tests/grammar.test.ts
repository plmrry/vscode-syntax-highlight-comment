import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { resolveMarker, SUPPORTED_MARKERS } from "../src/markers.js";

const rootDir = path.resolve(import.meta.dirname, "..");

const grammar = JSON.parse(
  fs.readFileSync(
    path.join(rootDir, "syntaxes", "syntax-highlight-comment.tmLanguage.json"),
    "utf8",
  ),
);

const manifest = JSON.parse(
  fs.readFileSync(path.join(rootDir, "package.json"), "utf8"),
);

const grammarContribution = manifest.contributes.grammars[0];

const aliasesByMarker = {
  css: ["css"],
  html: ["html"],
  js: ["js", "javascript"],
  jsx: ["jsx", "javascriptreact"],
  shell: ["shell", "shellscript", "sh", "bash", "zsh"],
  svg: ["svg"],
  ts: ["ts", "typescript"],
  tsx: ["tsx", "typescriptreact"],
};

describe("generated grammar", () => {
  it("declares the injection scope the manifest contributes", () => {
    expect(grammar.scopeName).toBe(grammarContribution.scopeName);
  });

  it("injects into the four JS/TS scopes the manifest lists", () => {
    for (const scope of grammarContribution.injectTo) {
      expect(grammar.injectionSelector).toContain(`L:${scope} `);
    }
  });

  it("excludes comments and strings from every injection selector", () => {
    const selectors = grammar.injectionSelector.split(",");
    expect(selectors).toHaveLength(grammarContribution.injectTo.length);
    for (const selector of selectors) {
      expect(selector).toContain("-comment");
      expect(selector).toContain("-string");
    }
  });

  it("has a top-level pattern and repository rule per supported marker", () => {
    expect(grammar.patterns).toEqual(
      SUPPORTED_MARKERS.map((marker) => ({ include: `#${marker}-template` })),
    );
    for (const marker of SUPPORTED_MARKERS) {
      expect(grammar.repository[`${marker}-template`]).toBeDefined();
    }
  });

  it("defines the shared template-interpolation rule against $base", () => {
    const rule = grammar.repository["template-interpolation"];
    expect(rule.begin).toBe("\\$\\{");
    expect(rule.end).toBe("\\}");
    expect(rule.patterns).toEqual([{ include: "$base" }]);
  });

  it("includes the interpolation rule in every marker rule", () => {
    for (const marker of SUPPORTED_MARKERS) {
      expect(grammar.repository[`${marker}-template`].patterns[0]).toEqual({
        include: "#template-interpolation",
      });
    }
  });

  it("matches every marker alias in the corresponding rule", () => {
    for (const [marker, aliases] of Object.entries(aliasesByMarker)) {
      const begin = grammar.repository[`${marker}-template`].begin;
      for (const alias of aliases) {
        expect(begin).toContain(alias);
      }
    }
  });

  it("matches each alias only in the rule its marker resolves to", () => {
    for (const [marker, aliases] of Object.entries(aliasesByMarker)) {
      for (const alias of aliases) {
        expect(resolveMarker(alias)).toBe(marker);
        const pattern = new RegExp(
          grammar.repository[`${marker}-template`].begin,
        );
        expect(pattern.test(`/** ${alias} */ \``)).toBe(true);
      }
    }
  });

  it("covers every alias known to resolveMarker", () => {
    const declared = Object.values(aliasesByMarker).flat();
    for (const alias of declared) {
      expect(resolveMarker(alias)).toBeDefined();
    }
    expect(new Set(declared).size).toBe(declared.length);
  });

  it("uses the embedded scopes the manifest maps to languages", () => {
    const grammarScopes = SUPPORTED_MARKERS.map(
      (marker) => grammar.repository[`${marker}-template`].contentName,
    ).sort();
    expect(grammarScopes).toEqual(
      Object.keys(grammarContribution.embeddedLanguages).sort(),
    );
    expect(grammarScopes).toEqual(
      Object.keys(grammarContribution.tokenTypes).sort(),
    );
  });

  it("terminates each rule on an unescaped backtick", () => {
    for (const marker of SUPPORTED_MARKERS) {
      expect(grammar.repository[`${marker}-template`].end).toBe("(?<!\\\\)`");
    }
  });

  it("does not match a marker comment without a following backtick", () => {
    for (const marker of SUPPORTED_MARKERS) {
      const pattern = new RegExp(
        grammar.repository[`${marker}-template`].begin,
      );
      expect(pattern.test(`/** ${marker} */ const a = 1;`)).toBe(false);
    }
  });

  it("matches a tagged template literal", () => {
    const pattern = new RegExp(grammar.repository["css-template"].begin);
    expect(pattern.test("/** css */ styled.div`")).toBe(true);
  });

  it("does not match an unsupported marker", () => {
    for (const marker of SUPPORTED_MARKERS) {
      const pattern = new RegExp(
        grammar.repository[`${marker}-template`].begin,
      );
      expect(pattern.test("/** scss */ `")).toBe(false);
      expect(pattern.test("/** python */ `")).toBe(false);
    }
  });
});
