import { asSchema, tool } from "ai";
import { z } from "zod";

import { uploadToWorker } from "@/lib/tools/server/upload-to-worker";

const MAX_FILES = 20;
const MAX_FILE_BYTES = 50 * 1024;
const MAX_TOTAL_BYTES = 500 * 1024;

/** Falls back to the first path segment, so `src/index.ts` becomes `src`. */
function deriveZipName(files: { filename: string }[]): string {
  const parts = (files[0]?.filename || "").split("/");
  return parts.length > 1 ? parts[0] : "files";
}

export const generateFilesTool = tool({
  description:
    "Generate multiple files and return them as a zip. Use when the user asks to create a group of files, a project structure, or multiple related files at once. Always provide a meaningful zipName based on the project or content.",
  inputSchema: asSchema(
    z.object({
      files: z
        .array(
          z.object({
            filename: z
              .string()
              .describe("File path with extension (e.g. 'src/index.ts', 'README.md')"),
            content: z.string().describe("The complete file content"),
          }),
        )
        .describe("Array of files to generate"),
      zipName: z
        .string()
        .optional()
        .describe(
          "Name for the zip file without extension (e.g. 'my-project'). Derive from the content or purpose",
        ),
      description: z
        .string()
        .optional()
        .describe("Brief one-line description of the generated files"),
    }),
  ),
  async execute({ files, zipName, description }) {
    if (files.length === 0) throw new Error("At least one file is required");
    if (files.length > MAX_FILES) throw new Error("Maximum 20 files allowed");

    let totalSize = 0;
    for (const f of files) {
      if (!f.filename) throw new Error("Each file must have a filename");
      if (f.content.length > MAX_FILE_BYTES) {
        throw new Error(`${f.filename} exceeds 50KB limit`);
      }
      totalSize += f.content.length;
    }
    if (totalSize > MAX_TOTAL_BYTES) throw new Error("Total content exceeds 500KB limit");

    const name = zipName?.trim() || deriveZipName(files);

    try {
      // Imported lazily so the JSZip bundle is only paid for when this
      // disabled-by-default tool is actually switched on.
      const { default: JSZip } = await import("jszip");

      const zip = new JSZip();
      for (const f of files) zip.file(f.filename, f.content);

      // STORE (no compression): the payload is mostly text that the upload
      // worker's own transfer already handles, and STORE is much faster.
      const buffer = await zip.generateAsync({
        type: "uint8array",
        compression: "STORE",
      });

      const { fileName, downloadUrl } = await uploadToWorker(
        // The cast narrows JSZip's Uint8Array to a plain ArrayBuffer, which is
        // what Blob accepts.
        new Blob([new Uint8Array(buffer).buffer as ArrayBuffer], {
          type: "application/zip",
        }),
        `${name}.zip`,
        "application/zip",
      );

      return {
        filename: fileName,
        description: description || `Generated ${files.length} files`,
        downloadUrl,
        size: buffer.length,
      };
    } catch (err) {
      throw new Error(
        err instanceof Error ? err.message : "File generation failed",
      );
    }
  },
});
