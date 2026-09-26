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
