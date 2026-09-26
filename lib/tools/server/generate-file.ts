import { asSchema, tool } from "ai";
import { z } from "zod";

import { uploadToWorker } from "@/lib/tools/server/upload-to-worker";

export const generateFileTool = tool({
  description:
    "Generate a file with content. Use when the user asks to create, generate, or write any file (code, config, document, script, etc). Always generate complete, working files with proper formatting.",
  inputSchema: asSchema(
    z.object({
      filename: z
        .string()
        .describe("Filename with extension (e.g. 'sort.py', 'config.json', 'README.md')"),
      content: z.string().describe("The complete file content to write"),
      description: z
        .string()
        .optional()
        .describe("Brief one-line description of what the file does"),
    }),
  ),
  async execute({ filename, content, description }) {
    try {
      const { fileName, downloadUrl } = await uploadToWorker(
        new Blob([content], { type: "text/plain" }),
        filename,
        "text/plain",
      );

      return {
        filename: fileName,
        description: description || `Generated ${filename}`,
        downloadUrl,
        size: content.length,
      };
    } catch (err) {
      throw new Error(
        err instanceof Error ? err.message : "File generation failed",
      );
    }
  },
});
