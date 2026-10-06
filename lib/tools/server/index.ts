import type { ToolSet } from "ai";

import { loadTools } from "@/lib/tools/tool-registry";

/**
 * Builds the tool set for one request.
 *
 * `webSearchEnabled` comes from the client's toggle. Local tools are
 * offered first so they always win a name collision with a remote one.
 */
export { loadTools } from "@/lib/tools/tool-registry";

/** Re-exports from the unified tool registry */
export { enabledTools, TOOL_REGISTRY } from "@/lib/tools/tool-registry";