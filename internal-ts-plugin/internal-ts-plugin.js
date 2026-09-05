const MARKER_COMMENT_PATTERN =
  /\/\*\*?\s*([a-zA-Z][\w-]*)\s*\*\/\s*(?:[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*\s*)?`/g;

const KNOWN_MARKERS = new Set([
  "bash",
  "css",
  "html",
  "javascript",
  "javascriptreact",
  "js",
  "jsx",
  "sh",
  "shell",
  "shellscript",
  "svg",
  "typescript",
  "typescriptreact",
  "ts",
  "tsx",
  "zsh",
]);

function findMatchingBacktick(text, start) {
  for (let i = start; i < text.length; i++) {
    const char = text[i];
    if (char === "\\") {
      i++;
      continue;
    }
    if (char === "`") {
      return i + 1;
    }
  }
  return -1;
}

function findMarkedTemplateRanges(text) {
  const ranges = [];
  MARKER_COMMENT_PATTERN.lastIndex = 0;

  let match = MARKER_COMMENT_PATTERN.exec(text);
  while (match) {
    const marker = match[1].trim().toLowerCase();
    if (KNOWN_MARKERS.has(marker)) {
      const templateStart = match.index + match[0].length - 1;
      const templateEnd = findMatchingBacktick(text, templateStart + 1);
      if (templateEnd !== -1) {
        ranges.push([templateStart, templateEnd]);
        MARKER_COMMENT_PATTERN.lastIndex = templateEnd;
      }
    }
    match = MARKER_COMMENT_PATTERN.exec(text);
  }

  return ranges;
}

function overlapsAnyRange(start, end, ranges) {
  return ranges.some(
    ([rangeStart, rangeEnd]) => start < rangeEnd && end > rangeStart,
  );
}

function init() {
  function create(info) {
    const languageService = info.languageService;
    const proxy = Object.create(null);

    for (const key of Object.keys(languageService)) {
      const original = languageService[key];
      proxy[key] =
        typeof original === "function"
          ? original.bind(languageService)
          : original;
    }

    function getMarkedRanges(fileName) {
      const program = languageService.getProgram();
      const sourceFile = program && program.getSourceFile(fileName);
      if (!sourceFile) {
        return [];
      }
      return findMarkedTemplateRanges(sourceFile.getFullText());
    }

    proxy.getEncodedSemanticClassifications = (fileName, span, format) => {
      const result = languageService.getEncodedSemanticClassifications(
        fileName,
        span,
        format,
      );
      const ranges = getMarkedRanges(fileName);
      if (ranges.length === 0) {
        return result;
      }

      const spans = [];
      for (let i = 0; i < result.spans.length; i += 3) {
        const start = result.spans[i];
        const length = result.spans[i + 1];
        const classificationType = result.spans[i + 2];
        if (overlapsAnyRange(start, start + length, ranges)) {
          continue;
        }
        spans.push(start, length, classificationType);
      }

      return { spans, endOfLineState: result.endOfLineState };
    };

    proxy.getSemanticClassifications = (fileName, span) => {
      const result = languageService.getSemanticClassifications(fileName, span);
      const ranges = getMarkedRanges(fileName);
      if (ranges.length === 0) {
        return result;
      }

      return result.filter((classification) => {
        const { start, length } = classification.textSpan;
        return !overlapsAnyRange(start, start + length, ranges);
      });
    };

    return proxy;
  }

  return { create };
}

module.exports = init;
