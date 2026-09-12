import { createModel } from "@/lib/providers/factory";
import { z } from "zod";
import { loadMcpTools } from "@/lib/mcp";
import { isTextReadable, fetchTextContent } from "@/lib/file-reader";
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
You have a URL fetch tool — use it when the user wants to read, summarize, or analyze any webpage.
You have a QR code generator tool — use it when the user wants a QR code for any text or URL.
You have a web search tool — use it when the user asks about current events, recent news, or anything you don't have knowledge about.`;

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

const urlFetchTool = tool({
  description: "Fetch and read the content of any webpage. Use when the user wants to read, summarize, or analyze a website.",
  inputSchema: asSchema(z.object({
    url: z.string().describe("The URL to fetch (must start with http:// or https://)"),
  })),
  async execute({ url }) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        signal: AbortSignal.timeout(15000),
        redirect: "follow",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      const html = await res.text();
      const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
      const title = titleMatch ? titleMatch[1].trim() : new URL(url).hostname;
      const content = html
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      const preview = content.slice(0, 5000);
      return {
        url,
        title,
        content: preview,
        totalLength: content.length,
        truncated: content.length > 5000,
      };
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : "Failed to fetch URL");
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

    // Extract file attachments from the last user message
    const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
    const fileAttachments = lastUserMessage?.parts
      ?.filter((p): p is Extract<UIMessage["parts"][number], { type: "file" }> => p.type === "file")
      .map((p) => ({
        filename: p.filename,
        url: p.url,
        mediaType: p.mediaType,
      })) ?? [];

    // Fetch content from text-readable files
    const fileContents: string[] = [];
    for (const file of fileAttachments) {
      if (file.filename && file.url && isTextReadable(file.filename)) {
        try {
          const content = await fetchTextContent(file.url);
          fileContents.push(`--- File: ${file.filename} ---\n${content}\n--- End of file ---`);
        } catch (err) {
          console.error(`Failed to read file ${file.filename}:`, err);
          fileContents.push(`--- File: ${file.filename} ---\n[Failed to read file content]\n--- End of file ---`);
        }
      }
    }

    const systemPrompt = fileContents.length > 0
      ? `${SYSTEM_PROMPT}\n\nThe user has uploaded the following files. Use the file contents to answer their question:\n\n${fileContents.join("\n\n")}`
      : SYSTEM_PROMPT;

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
        system: systemPrompt,
        messages: await convertToModelMessages(
          messages.map((message) => ({
            ...message,
            parts: message.parts.filter((part) => !(part.type === "file")),
          }))
        ),
        tools: {
          weather: weatherTool,
          "generate-file": generateFileTool,
          "url-fetch": urlFetchTool,
          "qr-code": qrCodeTool,
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
