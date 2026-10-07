/**
 * Single source of truth for "can the model read this file as text?".
 *
 * Upload (`lib/file-upload.ts`) and ingestion (`lib/file-reader.ts`) must
 * agree, otherwise a file passes validation and is then silently dropped.
 * Binary office formats (PDF, DOCX, ODT, ...) are NOT ingestible: we have
 * no text extraction for them, so they are rejected fast at upload instead
 * of being dropped silently later.
 */

const TEXT_MIME_TYPES = new Set([
  "application/json",
  "application/xml",
  "application/javascript",
  "application/x-javascript",
  "application/typescript",
  "application/x-yaml",
  "application/yaml",
  "application/x-tex",
  "application/x-latex",
  "application/x-sh",
  "application/x-shellscript",
  "application/sql",
  "application/toml",
  "application/csv",
]);

/** Extensions we can decode as text. No binary office formats. */
export const TEXT_EXTENSIONS = [
  ".txt",
  ".md",
  ".csv",
  ".json",
  ".xml",
  ".html",
  ".css",
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".py",
  ".java",
  ".c",
  ".cpp",
  ".rb",
  ".go",
  ".rs",
  ".sql",
  ".yaml",
  ".yml",
  ".toml",
  ".ini",
  ".cfg",
  ".log",
] as const;

export function getFileExtension(filename: string): string {
  const idx = filename.lastIndexOf(".");
  return idx >= 0 ? filename.slice(idx).toLowerCase() : "";
}

/** Strips `; charset=...` params so exact matching works. */
export function normalizeMime(mediaType?: string): string {
  return (mediaType ?? "").split(";")[0].trim().toLowerCase();
}

export function isTextMime(mediaType?: string): boolean {
  const lower = normalizeMime(mediaType);
  if (!lower) return false;
  if (lower.startsWith("text/")) return true;
  return TEXT_MIME_TYPES.has(lower);
}

/**
 * True when the model can read the file: text MIME or a known text
 * extension. One gate for upload validation and server ingestion.
 */
export function isIngestibleFile(mediaType?: string, filename?: string): boolean {
  if (isTextMime(mediaType)) return true;
  if (filename) {
    return (TEXT_EXTENSIONS as readonly string[]).includes(getFileExtension(filename));
  }
  return false;
}
