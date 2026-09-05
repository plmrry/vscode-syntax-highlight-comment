import { describe, expect, it } from "vitest";
import {
  findEmbeddedRegions,
  findInterpolations,
  maskInterpolations,
} from "./regions.js";

describe("findEmbeddedRegions", () => {
  it("finds a simple region and reports the body offsets", () => {
    const text = "const a = /* css */ `.foo {}`;";
    const regions = findEmbeddedRegions(text);

    expect(regions).toHaveLength(1);
    expect(regions[0].marker).toBe("css");
    expect(regions[0].language).toBe("css");
    expect(text.slice(regions[0].start, regions[0].end)).toBe(".foo {}");
  });

  it("resolves aliases to their canonical language", () => {
    const text = "const a = /* typescript */ `const x = 1;`;";
    const regions = findEmbeddedRegions(text);

    expect(regions[0].marker).toBe("typescript");
    expect(regions[0].language).toBe("ts");
  });

  it("accepts the docblock marker form", () => {
    const text = "const a = /** shell */ `ls`;";
    const regions = findEmbeddedRegions(text);

    expect(regions[0].language).toBe("shell");
    expect(text.slice(regions[0].start, regions[0].end)).toBe("ls");
  });

  it("accepts a tagged template", () => {
    const text = "const a = /* css */ String.raw`.foo {}`;";
    const regions = findEmbeddedRegions(text);

    expect(text.slice(regions[0].start, regions[0].end)).toBe(".foo {}");
  });

  it("ignores unsupported markers", () => {
    expect(findEmbeddedRegions("const a = /* python */ `pass`;")).toEqual([]);
  });

  it("ignores markers that are not followed by a template literal", () => {
    expect(findEmbeddedRegions("/* css */ const a = 1;")).toEqual([]);
  });

  it("finds multiple regions", () => {
    const text = [
      "const a = /* css */ `.a {}`;",
      "const b = /* shell */ `ls`;",
      "const c = /* html */ `<p></p>`;",
    ].join("\n");

    expect(findEmbeddedRegions(text).map((region) => region.language)).toEqual([
      "css",
      "shell",
      "html",
    ]);
  });

  it("does not treat a backtick inside an interpolation as the terminator", () => {
    const text =
      "const a = /* css */ `.a { color: ${cond ? `red` : `blue`}; }`;";
    const regions = findEmbeddedRegions(text);

    expect(regions).toHaveLength(1);
    expect(text.slice(regions[0].start, regions[0].end)).toBe(
      ".a { color: ${cond ? `red` : `blue`}; }",
    );
  });

  it("does not treat an escaped backtick as the terminator", () => {
    const text = "const a = /* css */ `.a { content: '\\`'; }`;";
    const regions = findEmbeddedRegions(text);

    expect(regions).toHaveLength(1);
    expect(text.slice(regions[0].start, regions[0].end)).toBe(
      ".a { content: '\\`'; }",
    );
  });

  it("skips an unterminated template without hanging", () => {
    expect(findEmbeddedRegions("const a = /* css */ `.foo {}")).toEqual([]);
  });

  it("does not find a region nested inside a preceding region body", () => {
    const text = "const a = /* css */ `.a {}`; const b = /* shell */ `ls`;";

    expect(findEmbeddedRegions(text).map((region) => region.language)).toEqual([
      "css",
      "shell",
    ]);
  });
});

describe("findInterpolations", () => {
  it("returns the span of each interpolation including the delimiters", () => {
    const text = "`a ${one} b ${two}`";
    const spans = findInterpolations(text, 1, text.length - 1);

    expect(spans.map((span) => text.slice(span.start, span.end))).toEqual([
      "${one}",
      "${two}",
    ]);
  });

  it("handles nested braces", () => {
    const text = "`${ {a: {b: 1}} }`";
    const spans = findInterpolations(text, 1, text.length - 1);

    expect(spans).toHaveLength(1);
    expect(text.slice(spans[0].start, spans[0].end)).toBe("${ {a: {b: 1}} }");
  });

  it("handles a brace inside a string inside an interpolation", () => {
    const text = '`${ x("}") }`';
    const spans = findInterpolations(text, 1, text.length - 1);

    expect(spans).toHaveLength(1);
    expect(text.slice(spans[0].start, spans[0].end)).toBe('${ x("}") }');
  });

  it("returns nothing when there are no interpolations", () => {
    expect(findInterpolations("`plain`", 1, 6)).toEqual([]);
  });
});

describe("maskInterpolations", () => {
  it("blanks interpolations while preserving length", () => {
    const text = "`.a { color: ${red}; }`";
    const masked = maskInterpolations(text, 1, text.length - 1);

    expect(masked).toBe(".a { color:       ; }");
    expect(masked).toHaveLength(text.length - 2);
  });

  it("preserves newlines so line offsets stay aligned", () => {
    const text = "`a ${\n  value\n} b`";
    const masked = maskInterpolations(text, 1, text.length - 1);

    expect(masked.split("\n")).toHaveLength(3);
    expect(masked).toHaveLength(text.length - 2);
  });

  it("returns the body unchanged when there is nothing to mask", () => {
    expect(maskInterpolations("`.a {}`", 1, 6)).toBe(".a {}");
  });
});
