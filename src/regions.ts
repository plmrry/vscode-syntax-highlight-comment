import { resolveMarker, type SupportedMarker } from "./markers.js";

const REGION_PATTERN =
  /\/\*\*?\s*([a-zA-Z][\w-]*)\s*\*\/(?:\s*(?:[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*\s*)?)`/g;

export interface EmbeddedRegion {
  marker: string;
  language: SupportedMarker;
  start: number;
  end: number;
}

export interface TextSpan {
  start: number;
  end: number;
}

export function findEmbeddedRegions(text: string): EmbeddedRegion[] {
  const regions: EmbeddedRegion[] = [];

  REGION_PATTERN.lastIndex = 0;
  let match = REGION_PATTERN.exec(text);

  while (match) {
    const marker = match[1];
    const language = resolveMarker(marker);
    const start = match.index + match[0].length;
    const end = findTemplateEnd(text, start);

    if (language && end !== -1) {
      regions.push({ marker, language, start, end });
    }

    REGION_PATTERN.lastIndex = end === -1 ? start : end;
    match = REGION_PATTERN.exec(text);
  }

  return regions;
}

export function findInterpolations(
  text: string,
  start: number,
  end: number,
): TextSpan[] {
  const spans: TextSpan[] = [];
  let index = start;

  while (index < end) {
    const character = text[index];

    if (character === "\\") {
      index += 2;
      continue;
    }

    if (character === "$" && text[index + 1] === "{") {
      const closing = skipInterpolation(text, index + 2);
      spans.push({ start: index, end: Math.min(closing, end) });
      index = closing;
      continue;
    }

    index += 1;
  }

  return spans;
}

export function maskInterpolations(
  text: string,
  start: number,
  end: number,
): string {
  const body = text.slice(start, end);
  const spans = findInterpolations(text, start, end);

  if (spans.length === 0) {
    return body;
  }

  const characters = [...body];

  for (const span of spans) {
    for (let index = span.start; index < span.end; index += 1) {
      const offset = index - start;
      if (characters[offset] !== undefined && characters[offset] !== "\n") {
        characters[offset] = " ";
      }
    }
  }

  return characters.join("");
}

function findTemplateEnd(text: string, start: number): number {
  let index = start;

  while (index < text.length) {
    const character = text[index];

    if (character === "\\") {
      index += 2;
      continue;
    }

    if (character === "`") {
      return index;
    }

    if (character === "$" && text[index + 1] === "{") {
      index = skipInterpolation(text, index + 2);
      continue;
    }

    index += 1;
  }

  return -1;
}

function skipInterpolation(text: string, start: number): number {
  let depth = 1;
  let index = start;

  while (index < text.length && depth > 0) {
    const character = text[index];

    if (character === "\\") {
      index += 2;
      continue;
    }

    if (character === "{") {
      depth += 1;
      index += 1;
      continue;
    }

    if (character === "}") {
      depth -= 1;
      index += 1;
      continue;
    }

    if (character === '"' || character === "'") {
      index = skipQuoted(text, index + 1, character);
      continue;
    }

    if (character === "`") {
      const nestedEnd = findTemplateEnd(text, index + 1);
      index = nestedEnd === -1 ? text.length : nestedEnd + 1;
      continue;
    }

    index += 1;
  }

  return index;
}

function skipQuoted(text: string, start: number, quote: string): number {
  let index = start;

  while (index < text.length) {
    const character = text[index];

    if (character === "\\") {
      index += 2;
      continue;
    }

    if (character === quote || character === "\n") {
      return index + 1;
    }

    index += 1;
  }

  return index;
}
