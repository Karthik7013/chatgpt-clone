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

// Allow long-running streaming responses (tool calls + reasoning can take a while).
export const maxDuration = 60;

const WORKER_URL = "https://ia-upload.karthiktumala143.workers.dev/";

const SYSTEM_PROMPT = `You are a helpful, direct assistant.
Format answers in GitHub-flavored markdown when it helps readability (lists, tables, code fences with a language tag).
You have a weather lookup tool — use it whenever the user asks about the weather or current conditions in any city, and cite the weather data in your answer.
You have a file generation tool — use it when the user asks you to create, generate, or write any file (code, config, document, script, etc). Always generate complete, working files with proper formatting.
You have a QR code generator tool — use it when the user wants a QR code for any text or URL.
You have a web search tool — use it when the user asks about current events, recent news, or anything you don't have knowledge about.
You have a time lookup tool — use it whenever the user asks what time or day it is.`;

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

const weatherTool = tool({
  description: "Get current weather for a city",
  inputSchema: asSchema(z.object({
    city: z.string().describe("The city name to look up weather for"),
  })),
  async execute({ city }) {
    try {
      const geoRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`,
      );
      if (!geoRes.ok) throw new Error(`geocoding failed (${geoRes.status})`);
      const geo = (await geoRes.json()) as {
        results?: Array<{
          name: string;
          country?: string;
          latitude: number;
          longitude: number;
        }>;
      };
      const place = geo.results?.[0];
      if (!place) throw new Error(`city "${city}" not found`);

      const wxRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,relative_humidity_2m,weather_code&timezone=auto`,
      );
      if (!wxRes.ok) throw new Error(`forecast failed (${wxRes.status})`);
      const wx = (await wxRes.json()) as {
        current?: {
          temperature_2m: number;
          relative_humidity_2m: number;
          weather_code: number;
        };
      };
      if (!wx.current) throw new Error("no current weather in response");

      return {
        city: place.country ? `${place.name}, ${place.country}` : place.name,
        condition: wmoToCondition(wx.current.weather_code),
        tempC: Math.round(wx.current.temperature_2m),
        humidity: wx.current.relative_humidity_2m,
      };
    } catch (err) {
      throw new Error(
        err instanceof Error ? err.message : "weather lookup failed",
      );
    }
  },
});

const qrCodeTool = tool({
  description: "Generate a QR code for any URL or text. Use when the user wants a QR code.",
  inputSchema: asSchema(z.object({
    content: z.string().describe("Text or URL to encode in the QR code"),
    size: z.number().optional().describe("Image size in pixels (default 300, max 1200)"),
  })),
  async execute({ content, size }) {
    try {
      const qrSize = Math.min(Math.max(size || 300, 64), 1200);
      const qrUrl = `https://qrcodecat.com/api/qrcode?data=${encodeURIComponent(content)}&size=${qrSize}&format=png&margin=4&color=0f172a&bgcolor=ffffff`;
      const res = await fetch(qrUrl, { signal: AbortSignal.timeout(15000) });
      if (!res.ok) throw new Error(`QR API returned ${res.status}`);
      const blob = await res.blob();
      const buffer = await blob.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      const dataUrl = `data:image/png;base64,${base64}`;
      return {
        qrCodeUrl: dataUrl,
        content,
        size: qrSize,
      };
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : "Failed to generate QR code");
    }
  },
});

const webSearchTool = tool({
  description: "Search the web for real-time information. Use when the user asks about current events, recent news, or anything you don't have knowledge about.",
  inputSchema: asSchema(z.object({
    query: z.string().describe("The search query"),
  })),
  async execute({ query }) {
    try {
      const res = await fetch(
        `https://freeserp.ai/api.php?q=${encodeURIComponent(query)}&size=5`,
        { signal: AbortSignal.timeout(10000) },
      );
      if (!res.ok) throw new Error(`Search API returned ${res.status}`);
      const data = await res.json() as {
        ok: boolean;
        results: Array<{ title: string; url: string; ai_summary: string; domain: string }>;
      };
      if (!data.ok) throw new Error("Search failed");
      return {
        results: data.results.map((r) => ({
          title: r.title,
          url: r.url,
          summary: r.ai_summary,
          domain: r.domain,
        })),
      };
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : "Web search failed");
    }
  },
});

const generateFileTool = tool({
  description: "Generate a file with content and upload it to Internet Archive. Use when the user asks to create, generate, or write any file (code, config, document, script, etc). Always generate complete, working files with proper formatting.",
  inputSchema: asSchema(z.object({
    filename: z.string().describe("Filename with extension (e.g. 'sort.py', 'config.json', 'README.md')"),
    content: z.string().describe("The complete file content to write"),
    description: z.string().optional().describe("Brief one-line description of what the file does"),
  })),
  async execute({ filename, content, description }) {
    try {
      const blob = new Blob([content], { type: "text/plain" });
      const file = new File([blob], filename, { type: "text/plain" });
      
      const response = await fetch(WORKER_URL, {
        method: "PUT",
        headers: {
          "X-File-Name": filename,
          "X-Media-Type": "texts",
          "Content-Type": "text/plain",
        },
        body: file,
      });
      
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Upload failed");
      
      return {
        filename: data.fileName,
        description: description || `Generated ${filename}`,
        downloadUrl: data.instantTmpUrl || data.instantDownloadUrl,
        publicUrl: data.publicDownloadUrl,
        detailsUrl: data.detailsUrl,
        size: content.length,
      };
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : "File generation failed");
    }
  },
});

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

    const selectedModel = model ?? "openrouter:nvidia/nemotron-3.5-lightning:free";

    // Read file contents from all user messages in parallel
    const messagesWithFiles = await Promise.all(
      messages.map(async (message) => {
        if (message.role !== "user") return message;
        const fileParts = message.parts?.filter(
          (p): p is Extract<UIMessage["parts"][number], { type: "file" }> =>
            p.type === "file",
        );
        if (!fileParts?.length) return message;
        const fileContents = await fetchAllFileContents(
          fileParts.map((p) => ({ filename: p.filename, url: p.url, mediaType: p.mediaType })),
        );
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
      close = async () => {};
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
          weather: weatherTool,
          "generate-file": generateFileTool,
          "qr-code": qrCodeTool,
          "get-time": getTimeTool,
          ...(webSearchEnabled !== false ? { "web-search": webSearchTool } : {}),
          ...mcpTools,
        },
        stopWhen: stepCountIs(5),
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
