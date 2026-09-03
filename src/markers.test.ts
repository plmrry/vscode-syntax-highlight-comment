import { describe, expect, it } from "vitest";
import { resolveMarker, SUPPORTED_MARKER_LIST, SUPPORTED_MARKERS } from "./markers.js";

describe("resolveMarker", () => {
  it("resolves canonical markers to themselves", () => {
    for (const marker of SUPPORTED_MARKERS) {
      expect(resolveMarker(marker)).toBe(marker);
    }
  });

  it("resolves aliases to their canonical marker", () => {
    expect(resolveMarker("bash")).toBe("shell");
    expect(resolveMarker("sh")).toBe("shell");
    expect(resolveMarker("zsh")).toBe("shell");
    expect(resolveMarker("javascript")).toBe("js");
    expect(resolveMarker("javascriptreact")).toBe("jsx");
    expect(resolveMarker("typescript")).toBe("ts");
    expect(resolveMarker("typescriptreact")).toBe("tsx");
  });

  it("normalizes case and surrounding whitespace", () => {
    expect(resolveMarker("CSS")).toBe("css");
    expect(resolveMarker("  css  ")).toBe("css");
    expect(resolveMarker("Bash")).toBe("shell");
  });

  it("returns undefined for unsupported markers", () => {
    expect(resolveMarker("python")).toBeUndefined();
    expect(resolveMarker("")).toBeUndefined();
  });
});

describe("SUPPORTED_MARKER_LIST", () => {
  it("joins all supported markers with a comma", () => {
    expect(SUPPORTED_MARKER_LIST).toBe(SUPPORTED_MARKERS.join(", "));
  });
});
