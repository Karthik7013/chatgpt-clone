import { createMcpHandler } from "mcp-handler";
import { z } from "zod";

// Self-hosted MCP server. Served at /api/mcp (Streamable HTTP) and
// /api/sse (legacy SSE) by the [transport] segment.
// Connect the chat route to it with:
//   MCP_SERVERS=[{"name":"local","url":"http://localhost:3000/api/mcp"}]
// On Vercel, replace the url with https://<your-app>.vercel.app/api/mcp.
export const maxDuration = 60;

const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      "get-time",
      {
        title: "Get current time",
        description:
          "Returns the current date and time, optionally in a given IANA timezone (e.g. Europe/Berlin). Use it whenever the user asks what time or day it is.",
        inputSchema: {
          timezone: z
            .string()
            .optional()
            .describe(
              "IANA timezone name, e.g. Europe/Berlin or America/New_York. Defaults to UTC.",
            ),
        },
      },
      async ({ timezone }) => {
        const tz = timezone?.trim() || "UTC";
        try {
          const now = new Date();
          const text = `Current time: ${new Intl.DateTimeFormat("en-GB", {
            dateStyle: "full",
            timeStyle: "long",
            timeZone: tz,
          }).format(now)} (${tz})`;
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
    );
  },
  {
    capabilities: { tools: {} },
  },
  {
    basePath: "/api",
    maxDuration: 60,
  },
);

export { handler as DELETE, handler as GET, handler as POST };
