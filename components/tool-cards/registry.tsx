import type { ComponentType } from "react";

import { FileCard } from "@/components/tool-cards/file-card";
import { QrCard } from "@/components/tool-cards/qr-card";
import { TimeCard } from "@/components/tool-cards/time-card";
import { WeatherCard } from "@/components/tool-cards/weather-card";
import { WebFetchCard } from "@/components/tool-cards/web-fetch-card";
import type { ToolCardProps } from "@/components/tool-cards/types";

/**
 * Tool name to the card that renders its result. A tool with no entry here
 * falls back to the generic collapsible renderer, so a new tool works without
 * a card at all.
 *
 * Keys are the base tool name, i.e. after `baseToolName()` strips any MCP
 * `<server>__` prefix. Several tools may share a card.
 */
export const TOOL_CARDS: Record<string, ComponentType<ToolCardProps>> = {
  weather: WeatherCard,
  "get-time": TimeCard,
  "web-fetch": WebFetchCard,
  "generate-file": FileCard,
  "generate-files": FileCard,
  "qr-code": QrCard,
};

export function toolCardFor(name: string): ComponentType<ToolCardProps> | undefined {
  return TOOL_CARDS[name];
}
