import { describe, expect, it } from "vitest";
import {
  resolveMarker,
  SUPPORTED_MARKER_LIST,
  SUPPORTED_MARKERS,
} from "../src/markers.js";

const aliasExpectations = {
  bash: "shell",
  css: "css",
  html: "html",
  javascript: "js",
  javascriptreact: "jsx",
  js: "js",
  jsx: "jsx",
  sh: "shell",
  shell: "shell",
  shellscript: "shell",
  svg: "svg",
  typescript: "ts",
  typescriptreact: "tsx",
  ts: "ts",
  tsx: "tsx",
  zsh: "shell",
};

describe("resolveMarker", () => {
  for (const [alias, expected] of Object.entries(aliasExpectations)) {
    it(`resolves "${alias}" to "${expected}"`, () => {
      expect(resolveMarker(alias)).toBe(expected);
    });
  }

  it("resolves every supported marker to itself", () => {
    for (const marker of SUPPORTED_MARKERS) {
      expect(resolveMarker(marker)).toBe(marker);
    }
  });

  it("returns undefined for unknown markers", () => {
    expect(resolveMarker("scss")).toBeUndefined();
    expect(resolveMarker("python")).toBeUndefined();
    expect(resolveMarker("graphql")).toBeUndefined();
    expect(resolveMarker("")).toBeUndefined();
  });

  it("normalizes case", () => {
    expect(resolveMarker("CSS")).toBe("css");
    expect(resolveMarker("Bash")).toBe("shell");
    expect(resolveMarker("TypeScriptReact")).toBe("tsx");
  });

  it("normalizes surrounding whitespace", () => {
    expect(resolveMarker("  css  ")).toBe("css");
    expect(resolveMarker("\tzsh\n")).toBe("shell");
  });

  it("does not resolve markers with internal whitespace", () => {
    expect(resolveMarker("c ss")).toBeUndefined();
  });
});

describe("SUPPORTED_MARKER_LIST", () => {
  it("is the comma-separated supported marker names", () => {
    expect(SUPPORTED_MARKER_LIST).toBe(
      "css, html, js, jsx, shell, svg, ts, tsx",
    );
  });

  it("lists every supported marker", () => {
    for (const marker of SUPPORTED_MARKERS) {
      expect(SUPPORTED_MARKER_LIST).toContain(marker);
    }
  });
});
