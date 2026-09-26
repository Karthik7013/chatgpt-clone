import { asSchema, tool } from "ai";
import { z } from "zod";

export const getTimeTool = tool({
  description:
    "Get the current date and time. Use it whenever the user asks what time or day it is.",
  inputSchema: asSchema(
    z.object({
      timezone: z
        .string()
        .optional()
        .describe(
          "IANA timezone name, e.g. Europe/Berlin or America/New_York. Defaults to UTC.",
        ),
    }),
  ),
  async execute({ timezone }) {
    const tz = timezone?.trim() || "UTC";
    try {
      const text = `Current time: ${new Intl.DateTimeFormat("en-GB", {
        dateStyle: "full",
        timeStyle: "long",
        timeZone: tz,
      }).format(new Date())} (${tz})`;
      return { content: [{ type: "text", text }] };
    } catch {
      return {
        content: [
          {
            type: "text",
            text: `Unknown timezone "${tz}". Use an IANA name like Europe/Berlin.`,
          },
        ],
        isError: true,
      };
    }
  },
});
