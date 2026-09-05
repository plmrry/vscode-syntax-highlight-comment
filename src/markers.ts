export const MARKER_ALIASES = {
  css: ["css"],
  html: ["html"],
  js: ["js", "javascript"],
  jsx: ["jsx", "javascriptreact"],
  shell: ["shell", "shellscript", "sh", "bash", "zsh"],
  svg: ["svg"],
  ts: ["ts", "typescript"],
  tsx: ["tsx", "typescriptreact"],
} as const;

export type SupportedMarker = keyof typeof MARKER_ALIASES;

export const SUPPORTED_MARKERS = Object.keys(
  MARKER_ALIASES,
) as SupportedMarker[];

export const SUPPORTED_MARKER_LIST = SUPPORTED_MARKERS.join(", ");

const ALIAS_LOOKUP = new Map<string, SupportedMarker>();

for (const marker of SUPPORTED_MARKERS) {
  for (const alias of MARKER_ALIASES[marker]) {
    ALIAS_LOOKUP.set(alias, marker);
  }
}

export function resolveMarker(marker: string): SupportedMarker | undefined {
  return ALIAS_LOOKUP.get(normalizeMarker(marker));
}

function normalizeMarker(marker: string): string {
  return marker.trim().toLowerCase();
}
