export const SUPPORTED_MARKERS = ["css", "html", "shell"] as const;

export type SupportedMarker = (typeof SUPPORTED_MARKERS)[number];

const MARKER_ALIASES = new Map<string, SupportedMarker>([
  ["css", "css"],
  ["html", "html"],
  ["shell", "shell"],
  ["shellscript", "shell"],
  ["sh", "shell"],
  ["bash", "shell"],
  ["zsh", "shell"]
]);

export const SUPPORTED_MARKER_LIST = SUPPORTED_MARKERS.join(", ");

export function resolveMarker(marker: string): SupportedMarker | undefined {
  return MARKER_ALIASES.get(normalizeMarker(marker));
}

function normalizeMarker(marker: string): string {
  return marker.trim().toLowerCase();
}
