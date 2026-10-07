import type { ComponentType } from "react";

import { TimeCard } from "@/components/tool-cards/time-card";
import { WebFetchCard } from "@/components/tool-cards/web-fetch-card";
import type { ToolCardProps } from "@/components/tool-cards/types";

/**
 * Tool name to the card that renders its result. A tool with no entry here
 * falls back to the generic collapsible renderer, so a new tool works without
 * a card at all.
 */
export const TOOL_CARDS: Record<string, ComponentType<ToolCardProps>> = {
  "get-time": TimeCard,
  "web-fetch": WebFetchCard,
};

export function toolCardFor(name: string): ComponentType<ToolCardProps> | undefined {
  return TOOL_CARDS[name];
}
