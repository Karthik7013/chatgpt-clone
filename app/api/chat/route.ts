import { google } from "@ai-sdk/google";
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

const SYSTEM_PROMPT = `You are a helpful, direct assistant in a Gemini-powered demo app.
Format answers in GitHub-flavored markdown when it helps readability (lists, tables, code fences with a language tag).
You have a weather lookup tool — use it whenever the user asks about the weather or current conditions in any city, and cite the weather data in your answer.
You have a file generation tool — use it when the user asks you to create, generate, or write any file (code, config, document, script, etc). Always generate complete, working files with proper formatting.`;

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
  const body = await req.json();
  const { messages, model }: { messages: UIMessage[]; model?: string } = body;
  const selectedModel = model ?? "gemini-3.5-flash";

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

  const { tools: mcpTools, closeAll } = await loadMcpTools();

  const result = streamText({
    model: google(selectedModel as string),
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
      ...mcpTools,
    },
    stopWhen: stepCountIs(5),
    onError: ({ error }) => {
      console.error("streamText error:", error);
      const msg = String(error);
      if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("quota")) {
        console.error("Rate limit hit for model:", selectedModel);
      }
      void closeAll();
    },
    onFinish: async () => {
      await closeAll();
    },
    onAbort: async () => {
      await closeAll();
    },
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      sendReasoning: true,
      sendSources: true,
    }),
  });
}
