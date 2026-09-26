import type { ToolSet } from "ai";

import { loadMcpTools } from "@/lib/mcp";
import { enabledTools } from "@/lib/tools/registry";
import { getTimeTool } from "@/lib/tools/server/get-time";
import { webFetchTool } from "@/lib/tools/server/web-fetch";
import { webSearchTool } from "@/lib/tools/server/web-search";
import { generateFileTool } from "@/lib/tools/server/generate-file";
import { generateFilesTool } from "@/lib/tools/server/generate-files";
import { qrCodeTool } from "@/lib/tools/server/qr-code";
import { weatherTool } from "@/lib/tools/server/weather";

/**
 * Every tool implementation, keyed by the name the model sees. Whether a tool
 * is actually offered to the model is decided by `enabled` in
 * `lib/tools/registry.ts` — this map is the implementation lookup only.
 */
const IMPLEMENTATIONS: Record<string, ToolSet[string]> = {
  "get-time": getTimeTool,
  "web-search": webSearchTool,
  "web-fetch": webFetchTool,
  "weather": weatherTool,
  "generate-file": generateFileTool,
  "generate-files": generateFilesTool,
  "qr-code": qrCodeTool,
};

export type LoadedTools = {
  tools: ToolSet;
  /** Releases any connections `loadTools` opened. Always safe to call. */
  closeAll: () => Promise<void>;
};

/**
 * Builds the tool set for one request.
 *
 * `webSearchEnabled` comes from the client's toggle. MCP tools are appended
 * last so a local tool always wins a name collision with a remote one.
 */
export async function loadTools({
  webSearchEnabled = true,
}: { webSearchEnabled?: boolean } = {}): Promise<LoadedTools> {
  const tools: ToolSet = {};

  for (const { name } of enabledTools()) {
    const implementation = IMPLEMENTATIONS[name];
    if (implementation) tools[name] = implementation;
  }

  if (webSearchEnabled === false) delete tools["web-search"];

  // MCP is a stub today (see lib/mcp.ts) and cannot fail, so there is no
  // error handling here beyond closing whatever it hands back.
  const mcp = await loadMcpTools();

  return {
    tools: { ...tools, ...mcp.tools },
    closeAll: mcp.closeAll,
  };
}
