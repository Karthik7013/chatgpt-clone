"use client";

import { createElement } from "react";

import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import { baseToolName } from "@/lib/tool-names";
import { toolCardFor } from "@/components/tool-cards/registry";
import { getToolName, type ToolPartLike } from "@/lib/tool-parts";
import type { ToolState } from "@/components/ai-elements/tool";

export type { ToolPartLike } from "@/lib/tool-parts";

export function ToolPart({
  part,
  isStreamingTarget,
}: {
  part: ToolPartLike;
  isStreamingTarget: boolean;
}) {
  const toolName = getToolName(part);
  // The generic header labels the tool from this string, so it keeps the
  // `tool-` prefix that MCP names do not carry.
  const typeLabel =
    part.type === "dynamic-tool" ? `tool-${part.toolName ?? "unknown"}` : part.type;

  // Known tools get a rich card. The lookup uses the base name because MCP
  // namespaces tools as `<server>__<tool>`, and both spellings should resolve
  // to the same card. Unknown tools fall through to the generic renderer.
  //
  // createElement rather than `<Card />`: the card comes from a module-level
  // registry, so it is a fixed component and not one created per render.
  const Card = toolCardFor(baseToolName(toolName));
  if (Card) {
  return createElement(Card, {
    name: toolName,
    state: part.state as ToolState,
    input: part.input,
    output: part.output,
    errorText: part.errorText,
  });
  }

  // Force the generic card open while the tool runs so the Preparing/Running
  // state is visible, then hand control back to the user.
  const toolState = part.state as ToolState;
  const isLive =
    isStreamingTarget &&
    (part.state === "input-streaming" || part.state === "input-available");

  return (
    <Tool defaultOpen={part.state === "output-error"} open={isLive ? true : undefined}>
      <ToolHeader type={typeLabel} state={toolState} />
      <ToolContent>
        <ToolInput input={part.input} />
        <ToolOutput output={part.output} errorText={part.errorText} />
      </ToolContent>
    </Tool>
  );
}
