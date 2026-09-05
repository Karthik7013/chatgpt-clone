import { google } from "@ai-sdk/google";
import { z } from "zod";
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

const SYSTEM_PROMPT = `You are a helpful, direct assistant in a Gemini-powered demo app.
Format answers in GitHub-flavored markdown when it helps readability (lists, tables, code fences with a language tag).
You have a weather lookup tool — use it whenever the user asks about the weather or current conditions in any city, and cite the weather data in your answer.`;

const weatherTool = tool({
  description: "Get current weather for a city",
  inputSchema: asSchema(z.object({
    city: z.string().describe("The city name to look up weather for"),
  })),
  async execute({ city }) {
    const conditions = ["Sunny", "Cloudy", "Rainy", "Partly Cloudy", "Snowy", "Windy", "Foggy"];
    const temp = Math.floor(Math.random() * 30) + 10;
    const humidity = Math.floor(Math.random() * 60) + 30;
    return {
      title: `Weather in ${city}`,
      output: `Current weather in ${city}: ${conditions[Math.floor(Math.random() * conditions.length)]}, ${temp}°C, Humidity: ${humidity}%.`,
    };
  },
});

export async function POST(req: Request) {
  const body = await req.json();
  const { messages, model }: { messages: UIMessage[]; model?: string } = body;
  const selectedModel = model ?? "gemini-2.5-flash";

  const result = streamText({
    model: google(selectedModel as string),
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
    tools: {
      weather: weatherTool,
    },
    stopWhen: stepCountIs(5),
    onError: ({ error }) => {
      console.error("streamText error:", error);
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
