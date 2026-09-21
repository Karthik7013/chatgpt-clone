import { createModel } from "@/lib/providers/factory";
import { z } from "zod";
import { loadMcpTools } from "@/lib/mcp";
import { fetchAllFileContents } from "@/lib/file-reader";
import {
  asSchema,
  convertToModelMessages,
  createUIMessageStreamResponse,
  stepCountIs,
  streamText,
  toUIMessageStream,
  tool,
  type UIMessage,
} from "ai";
// import JSZip from "jszip";

// Allow long-running streaming responses (tool calls + reasoning can take a while).
export const maxDuration = 60;

const WORKER_URL = "https://ia-upload.karthiktumala143.workers.dev/";

const SYSTEM_PROMPT = `You are a helpful, direct assistant.
Format answers in GitHub-flavored markdown when it helps readability (lists, tables, code fences with a language tag).
You have a web search tool — use it when the user asks about current events, recent news, or anything you don't have knowledge about. The tool returns search results with full page content from each source.
When using web search results, ALWAYS cite sources using [1], [2], etc. matching the index from the results. Place citations at the end of the relevant sentence or paragraph.
You have a web fetch tool — use it when the user wants you to read a specific URL or web page content.
You have a time lookup tool — use it whenever the user asks what time or day it is.`;

const getTimeTool = tool({
  description: "Get the current date and time. Use it whenever the user asks what time or day it is.",
  inputSchema: asSchema(z.object({
    timezone: z.string().optional().describe("IANA timezone name, e.g. Europe/Berlin or America/New_York. Defaults to UTC."),
  })),
  async execute({ timezone }) {
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
        content: [{ type: "text", text: `Unknown timezone "${tz}". Use an IANA name like Europe/Berlin.` }],
        isError: true,
      };
    }
  },
});

/** Maps Open-Meteo WMO weather codes to a short display condition. */
function wmoToCondition(code: number): string {
  if (code === 0 || code === 1) return "Clear";
  if (code === 2) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if (code === 45 || code === 48) return "Fog";
  if (code >= 51 && code <= 57) return "Drizzle";
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return "Rain";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "Snow";
  if (code >= 95) return "Thunderstorm";
  return "Cloudy";
}

// const weatherTool = tool({
//   description: "Get current weather for a city",
//   inputSchema: asSchema(z.object({
//     city: z.string().describe("The city name to look up weather for"),
//   })),
//   async execute({ city }) {
//     try {
//       const geoRes = await fetch(
//         `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`,
//       );
//       if (!geoRes.ok) throw new Error(`geocoding failed (${geoRes.status})`);
//       const geo = (await geoRes.json()) as {
//         results?: Array<{
//           name: string;
//           country?: string;
//           latitude: number;
//           longitude: number;
//         }>;
//       };
//       const place = geo.results?.[0];
//       if (!place) throw new Error(`city "${city}" not found`);
//
//       const wxRes = await fetch(
//         `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,relative_humidity_2m,weather_code&timezone=auto`,
//       );
//       if (!wxRes.ok) throw new Error(`forecast failed (${wxRes.status})`);
//       const wx = (await wxRes.json()) as {
//         current?: {
//           temperature_2m: number;
//           relative_humidity_2m: number;
//           weather_code: number;
//         };
//       };
//       if (!wx.current) throw new Error("no current weather in response");
//
//       return {
//         city: place.country ? `${place.name}, ${place.country}` : place.name,
//         condition: wmoToCondition(wx.current.weather_code),
//         tempC: Math.round(wx.current.temperature_2m),
//         humidity: wx.current.relative_humidity_2m,
//       };
//     } catch (err) {
//       throw new Error(
//         err instanceof Error ? err.message : "weather lookup failed",
//       );
//     }
//   },
// });

// const qrCodeTool = tool({
//   description: "Generate a QR code for any URL or text. Use when the user wants a QR code.",
//   inputSchema: asSchema(z.object({
//     content: z.string().describe("Text or URL to encode in the QR code"),
//     size: z.number().optional().describe("Image size in pixels (default 300, max 1200)"),
//   })),
//   async execute({ content, size }) {
//     try {
//       const qrSize = Math.min(Math.max(size || 300, 64), 1200);
//       const qrUrl = `https://qrcodecat.com/api/qrcode?data=${encodeURIComponent(content)}&size=${qrSize}&format=png&margin=4&color=0f172a&bgcolor=ffffff`;
//       const res = await fetch(qrUrl, { signal: AbortSignal.timeout(15000) });
//       if (!res.ok) throw new Error(`QR API returned ${res.status}`);
//       const blob = await res.blob();
//       const buffer = await blob.arrayBuffer();
//       const base64 = Buffer.from(buffer).toString("base64");
//       const dataUrl = `data:image/png;base64,${base64}`;
//       return {
//         qrCodeUrl: dataUrl,
//         content,
//         size: qrSize,
//       };
//     } catch (err) {
//       throw new Error(err instanceof Error ? err.message : "Failed to generate QR code");
//     }
//   },
// });

function extractTextFromHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<li>/gi, "- ")
    .replace(/<a [^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/gi, "[$2]($1)")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function fetchPageContent(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(12000),
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ChatGPT-Clone/1.0)",
        "Accept": "text/html,text/plain",
      },
    });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "";
    const html = await res.text();
    if (contentType.includes("text/plain")) return html.slice(0, 15000);
    return extractTextFromHtml(html).slice(0, 15000);
  } catch {
    return null;
  }
}

const webSearchTool = tool({
  description: "Search the web and read full page content. Returns search results with fetched content from each page. Use when the user asks about current events, recent news, or anything you need real-time information about. Always cite sources using [1], [2], etc.",
  inputSchema: asSchema(z.object({
    query: z.string().describe("The search query"),
    numResults: z.number().optional().describe("Number of results to fetch (default 3, max 5)"),
  })),
  async execute({ query, numResults }) {
    const size = Math.min(Math.max(numResults ?? 3, 1), 5);
    try {
      const res = await fetch(
        `https://freeserp.ai/api.php?q=${encodeURIComponent(query)}&size=${size}`,
        { signal: AbortSignal.timeout(15000) },
      );
      if (!res.ok) throw new Error(`Search API returned ${res.status}`);
      const data = await res.json() as {
        ok: boolean;
        results: Array<{ title: string; url: string; ai_summary: string; domain: string }>;
      };
      if (!data.ok) throw new Error("Search returned no results");
      if (!data.results?.length) {
        return { results: [], message: "No results found for this query." };
      }

      // Fetch full content from each result in parallel
      const results = await Promise.all(
        data.results.map(async (r, i) => {
          const content = await fetchPageContent(r.url);
          return {
            index: i + 1,
            title: r.title,
            url: r.url,
            domain: r.domain,
            summary: r.ai_summary,
            content: content || `[Could not fetch page content]`,
          };
        }),
      );

      return { results };
    } catch (err) {
      if (err instanceof DOMException && err.name === "TimeoutError") {
        throw new Error("Web search timed out. Try a simpler query.");
      }
      throw new Error(err instanceof Error ? err.message : "Web search failed");
    }
  },
});

const webFetchTool = tool({
  description: "Fetch and read the content of a specific web page URL. Use when the user wants to read a specific article or page.",
  inputSchema: asSchema(z.object({
    url: z.string().describe("The URL to fetch"),
  })),
  async execute({ url }) {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(20000),
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; ChatGPT-Clone/1.0)",
          "Accept": "text/html,application/xhtml+xml,text/plain",
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);

      const contentType = res.headers.get("content-type") ?? "";
      const html = await res.text();

      if (contentType.includes("application/json")) {
        return { url, content: JSON.stringify(JSON.parse(html), null, 2).slice(0, 30000), type: "json" };
      }
      if (contentType.includes("text/plain")) {
        return { url, content: html.slice(0, 30000), type: "text" };
      }

      const text = extractTextFromHtml(html);
      if (!text) return { url, content: "[Page returned empty content]", type: "empty" };
      return { url, content: text.slice(0, 30000), type: "html" };
    } catch (err) {
      if (err instanceof DOMException && err.name === "TimeoutError") {
        throw new Error("Page fetch timed out.");
      }
      throw new Error(err instanceof Error ? err.message : "Failed to fetch URL");
    }
  },
});

// const generateFileTool = tool({
//   description: "Generate a file with content. Use when the user asks to create, generate, or write any file (code, config, document, script, etc). Always generate complete, working files with proper formatting.",
//   inputSchema: asSchema(z.object({
//     filename: z.string().describe("Filename with extension (e.g. 'sort.py', 'config.json', 'README.md')"),
//     content: z.string().describe("The complete file content to write"),
//     description: z.string().optional().describe("Brief one-line description of what the file does"),
//   })),
//   async execute({ filename, content, description }) {
//     try {
//       const blob = new Blob([content], { type: "text/plain" });
//       const file = new File([blob], filename, { type: "text/plain" });
//
//       const controller = new AbortController();
//       const timeout = setTimeout(() => controller.abort(), 15_000);
//       let response: Response;
//       try {
//         response = await fetch(WORKER_URL, {
//           method: "PUT",
//           headers: {
//             "X-File-Name": filename,
//             "X-Media-Type": "texts",
//             "Content-Type": "text/plain",
//           },
//           body: file,
//           signal: controller.signal,
//         });
//       } finally {
//         clearTimeout(timeout);
//       }
//
//       const data = await response.json();
//       if (!response.ok || !data.success) throw new Error(data.error || "Upload failed");
//
//       return {
//         filename: data.fileName,
//         description: description || `Generated ${filename}`,
//         downloadUrl: data.instantDownloadUrl || data.instantTmpUrl,
//         size: content.length,
//       };
//     } catch (err) {
//       throw new Error(err instanceof Error ? err.message : "File generation failed");
//     }
//   },
// });

// function deriveZipName(files: { filename: string }[]): string {
//   const first = files[0]?.filename || "";
//   const parts = first.split("/");
//   if (parts.length > 1) return parts[0];
//   return "files";
// }

// const generateFilesTool = tool({
//   description: "Generate multiple files and return them as a zip. Use when the user asks to create a group of files, a project structure, or multiple related files at once. Always provide a meaningful zipName based on the project or content.",
//   inputSchema: asSchema(z.object({
//     files: z.array(z.object({
//       filename: z.string().describe("File path with extension (e.g. 'src/index.ts', 'README.md')"),
//       content: z.string().describe("The complete file content"),
//     })).describe("Array of files to generate"),
//     zipName: z.string().optional().describe("Name for the zip file without extension (e.g. 'my-project'). Derive from the content or purpose"),
//     description: z.string().optional().describe("Brief one-line description of the generated files"),
//   })),
//   async execute({ files, zipName, description }) {
//     if (files.length === 0) throw new Error("At least one file is required");
//     if (files.length > 20) throw new Error("Maximum 20 files allowed");
//
//     let totalSize = 0;
//     for (const f of files) {
//       if (!f.filename) throw new Error("Each file must have a filename");
//       if (f.content.length > 50 * 1024) throw new Error(`${f.filename} exceeds 50KB limit`);
//       totalSize += f.content.length;
//     }
//     if (totalSize > 500 * 1024) throw new Error("Total content exceeds 500KB limit");
//
//     const name = zipName?.trim() || deriveZipName(files);
//
//     try {
//       const zip = new JSZip();
//       for (const f of files) {
//         zip.file(f.filename, f.content);
//       }
//       const buffer = await zip.generateAsync({ type: "uint8array", compression: "STORE" });
//
//       const blob = new Blob([new Uint8Array(buffer).buffer as ArrayBuffer], { type: "application/zip" });
//       const file = new File([blob], `${name}.zip`, { type: "application/zip" });
//
//       const controller = new AbortController();
//       const timeout = setTimeout(() => controller.abort(), 15_000);
//       let response: Response;
//       try {
//         response = await fetch(WORKER_URL, {
//           method: "PUT",
//           headers: {
//             "X-File-Name": `${name}.zip`,
//             "X-Media-Type": "texts",
//             "Content-Type": "application/zip",
//           },
//           body: file,
//           signal: controller.signal,
//         });
//       } finally {
//         clearTimeout(timeout);
//       }
//
//       const data = await response.json();
//       if (!response.ok || !data.success) throw new Error(data.error || "Upload failed");
//
//       return {
//         filename: data.fileName,
//         description: description || `Generated ${files.length} files`,
//         downloadUrl: data.instantDownloadUrl || data.instantTmpUrl,
//         size: buffer.length,
//       };
//     } catch (err) {
//       throw new Error(err instanceof Error ? err.message : "File generation failed");
//     }
//   },
// });

export async function POST(req: Request) {
  let closeAll: (() => Promise<void>) | undefined;

  try {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { messages, model, webSearchEnabled } = body as { messages?: UIMessage[]; model?: string; webSearchEnabled?: boolean };
    if (!Array.isArray(messages) || messages.length === 0) {
      return Response.json({ error: "messages array required" }, { status: 400 });
    }

    const selectedModel = model ?? "kilo:kilo-auto/free";

    // Read file contents from all user messages in parallel
    const messagesWithFiles = await Promise.all(
      messages.map(async (message) => {
        if (message.role !== "user") return message;
        const fileParts = message.parts?.filter(
          (p): p is Extract<UIMessage["parts"][number], { type: "file" }> =>
            p.type === "file",
        );
        if (!fileParts?.length) return message;

        console.log("📎 [file-reader] Found file parts:", JSON.stringify(fileParts.map(f => ({
          filename: f.filename,
          mediaType: f.mediaType,
          url: f.url,
          tmpUrl: (f as unknown as { tmpUrl?: string }).tmpUrl,
        })), null, 2));

        const fileContents = await fetchAllFileContents(
          fileParts.map((p) => ({
            filename: p.filename,
            url: (p as unknown as { tmpUrl?: string }).tmpUrl || p.url,
            mediaType: p.mediaType,
          })),
        );

        console.log("📄 [file-reader] Read contents:", fileContents.length, "files");
        fileContents.forEach((content, i) => {
          console.log(`--- File ${i + 1} ---`);
          console.log(content.slice(0, 500));
          console.log("--- End ---");
        });

        if (!fileContents.length) return message;
        const textParts = message.parts?.filter((p) => p.type === "text") ?? [];
        const fileText = fileContents.join("\n\n");
        return {
          ...message,
          parts: [
            ...textParts,
            { type: "text" as const, text: fileText },
          ],
        };
      }),
    );

    let mcpTools: Record<string, unknown>;
    let close: () => Promise<void>;
    try {
      ({ tools: mcpTools, closeAll: close } = await loadMcpTools());
    } catch (err) {
      console.error("Failed to load MCP tools:", err);
      mcpTools = {};
      close = async () => { };
    }
    closeAll = close;

    let result;
    try {
      result = streamText({
        model: createModel(selectedModel),
        system: SYSTEM_PROMPT,
        messages: await convertToModelMessages(
          messagesWithFiles.map((message) => ({
            ...message,
            parts: message.parts.filter((part) => !(part.type === "file")),
          }))
        ),
        tools: {
          ...(webSearchEnabled !== false ? { "web-search": webSearchTool } : {}),
          "web-fetch": webFetchTool,
          "get-time": getTimeTool,
          ...mcpTools,
        },
        stopWhen: stepCountIs(10),
        onError: ({ error }) => {
          console.error("streamText error:", error);
          const msg = String(error);
          if (msg.includes("429") || msg.includes("rate_limit") || msg.includes("quota")) {
            console.error("Rate limit hit for model:", selectedModel);
          }
          void closeAll?.();
        },
        onFinish: async () => {
          await closeAll?.();
        },
        onAbort: async () => {
          await closeAll?.();
        },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Failed to start stream:", msg);
      if (closeAll) await closeAll();
      if (msg.includes("Unknown provider") || msg.includes("API key not configured")) {
        return Response.json({ error: msg }, { status: 400 });
      }
      return Response.json({ error: "Failed to generate response" }, { status: 500 });
    }

    return createUIMessageStreamResponse({
      stream: toUIMessageStream({
        stream: result.stream,
        sendReasoning: true,
        sendSources: true,
      }),
    });
  } catch (err) {
    console.error("Unhandled error in POST /api/chat:", err);
    if (closeAll) await closeAll();
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
