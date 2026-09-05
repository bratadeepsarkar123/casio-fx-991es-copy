/** Default GitHub Pages path for this clone. */
export const DEFAULT_VITE_BASE = "/casio-fx-991es-copy/";

/**
 * Normalize Vite `base` so concatenating `index.html` cannot yield `/fooindex.html`.
 * Ensures a leading `/` (or `./`) and a trailing `/`.
 */
export function normalizeViteBase(raw: string | undefined, fallback = DEFAULT_VITE_BASE): string {
  const trimmed = raw?.trim() ?? "";
  const value = trimmed.length > 0 ? trimmed : fallback;
  const withLead = value.startsWith("/") || value.startsWith(".") ? value : `/${value}`;
  return withLead.endsWith("/") ? withLead : `${withLead}/`;
}
