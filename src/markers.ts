export const SUPPORTED_MARKERS = ["css", "html", "shell", "svg"] as const;

export type SupportedMarker = (typeof SUPPORTED_MARKERS)[number];

const MARKER_ALIASES = new Map<string, SupportedMarker>([
  ["bash", "shell"],
  ["css", "css"],
  ["html", "html"],
  ["sh", "shell"],
  ["shell", "shell"],
  ["shellscript", "shell"],
  ["svg", "svg"],
  ["zsh", "shell"],
]);

export const SUPPORTED_MARKER_LIST = SUPPORTED_MARKERS.join(", ");

export function resolveMarker(marker: string): SupportedMarker | undefined {
  return MARKER_ALIASES.get(normalizeMarker(marker));
}

function normalizeMarker(marker: string): string {
  return marker.trim().toLowerCase();
}
