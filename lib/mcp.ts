export async function loadMcpTools(): Promise<{
  tools: Record<string, unknown>;
  closeAll: () => Promise<void>;
}> {
  return { tools: {}, closeAll: async () => {} };
}
