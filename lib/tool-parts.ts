import { baseToolName, partToolName } from "@/lib/tool-names";

export type ToolPartLike = {
  type: string;
  toolName?: string;
  state: string;
  input?: unknown;
  output?: unknown;
  errorText?: string;
};

export function isToolPart(part: unknown): part is ToolPartLike {
  if (!part || typeof part !== "object") return false;
  const p = part as { type?: unknown; state?: unknown };
  if (typeof p.state !== "string") return false;
  if (typeof p.type !== "string") return false;
  if (!(p.type.startsWith("tool-") || p.type === "dynamic-tool")) return false;
  return true;
}

export function getToolName(part: ToolPartLike): string {
  return partToolName(part);
}

export function getToolBaseName(part: ToolPartLike): string {
  return baseToolName(getToolName(part));
}

export function isWebSearchTool(part: ToolPartLike): boolean {
  return getToolBaseName(part) === "web-search";
}

export function hasToolOutput(part: ToolPartLike): boolean {
  return part.state === "output-available" || part.state === "output-error";
}
