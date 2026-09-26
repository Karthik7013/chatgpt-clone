import type { ToolState } from "@/components/ai-elements/tool";

/**
 * Props every tool card receives. `input` and `output` stay `unknown` because
 * each tool has its own shape; a card narrows them itself and falls back to
 * the generic renderer when the shape is unexpected.
 */
export type ToolCardProps = {
  /** Tool name with any MCP `<server>__` prefix already stripped. */
  name: string;
  state: ToolState;
  input?: unknown;
  output?: unknown;
  errorText?: string;
};

/**
 * Tool name as it appears in a message part: `tool-web-fetch`, or
 * `dynamic-tool` when the tool came from a server we had no types for.
 */
export function partToolName(part: { type: string; toolName?: string }): string {
  if (part.type === "dynamic-tool") return part.toolName ?? "unknown";
  return part.type.replace(/^tool-/, "");
}

/**
 * MCP namespaces its tools as `<server>__<tool>`, so `local__get-time` and
 * `get-time` must render the same card. Strips the server prefix.
 */
export function baseToolName(name: string): string {
  const separator = name.lastIndexOf("__");
  return separator === -1 ? name : name.slice(separator + 2);
}
