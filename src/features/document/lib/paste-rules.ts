/**
 * Paste normalization.
 *
 * ProseMirror already sanitizes by construction: pasted HTML is parsed against
 * the schema and anything unmatched is dropped, so scripts and unknown tags
 * cannot survive. No general sanitizer is needed.
 *
 * The one real gap is Google Docs, which wraps copied content in
 * <b style="font-weight:normal"> as a styling artifact. ProseMirror faithfully
 * reads that as bold, so everything pasted from Docs arrives bold.
 */

const GOOGLE_DOCS_BOLD =
  /<b(?=[^>]*\sstyle\s*=\s*["'][^"']*font-weight\s*:\s*normal)[^>]*>([\s\S]*?)<\/b>/gi;

/** Unwraps Google Docs' normal-weight <b> wrapper, preserving its children. */
export function stripGoogleDocsBold(html: string): string {
  return html.replace(GOOGLE_DOCS_BOLD, "$1");
}
