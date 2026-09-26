/**
 * MCP (Model Context Protocol) tool loading.
 *
 * NOT IMPLEMENTED. This always returns zero tools and a no-op `closeAll`, so
 * callers must not treat it as a real dependency yet. It exists so the tool
 * plumbing in `lib/tools/server/index.ts` and `app/api/chat/route.ts` has a
 * seam to grow into.
 *
 * To implement: read `MCP_SERVERS` (a JSON array of `{ name, url }`), connect
 * each with `@ai-sdk/mcp` (already a dependency), and convert the result into a
 * `ToolSet`. Return real MCP clients from `closeAll` so sockets are released.
 * The self-hosted server that `app/api/[transport]/route.ts` exposes is a
 * usable target for testing.
 */
export async function loadMcpTools(): Promise<{
  tools: Record<string, never>;
  closeAll: () => Promise<void>;
}> {
  return { tools: {}, closeAll: async () => {} };
}
