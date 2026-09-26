import { asSchema, tool } from "ai";
import { z } from "zod";

export const qrCodeTool = tool({
  description:
    "Generate a QR code for any URL or text. Use when the user wants a QR code.",
  inputSchema: asSchema(
    z.object({
      content: z.string().describe("Text or URL to encode in the QR code"),
      size: z
        .number()
        .optional()
        .describe("Image size in pixels (default 300, max 1200)"),
    }),
  ),
  async execute({ content, size }) {
    try {
      const qrSize = Math.min(Math.max(size || 300, 64), 1200);
      const qrUrl = `https://qrcodecat.com/api/qrcode?data=${encodeURIComponent(content)}&size=${qrSize}&format=png&margin=4&color=0f172a&bgcolor=ffffff`;
      const res = await fetch(qrUrl, { signal: AbortSignal.timeout(15_000) });
      if (!res.ok) throw new Error(`QR API returned ${res.status}`);

      const buffer = await (await res.blob()).arrayBuffer();
      return {
        qrCodeUrl: `data:image/png;base64,${Buffer.from(buffer).toString("base64")}`,
        content,
        size: qrSize,
      };
    } catch (err) {
      throw new Error(
        err instanceof Error ? err.message : "Failed to generate QR code",
      );
    }
  },
});
