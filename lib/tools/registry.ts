/**
 * Tool metadata shared by the server (which tools the model may call) and the
 * client (which card renders a tool's result).
 *
 * Keep this file dependency-free. It is imported from both server and client
 * code, so pulling in `zod`, `ai`, or React here would break the RSC boundary
 * or ship server code to the browser.
 */
export type ToolMeta = {
  /** Key passed to `streamText`, and looked up in the tool-card registry. */
  name: string;
  /** Human-readable name shown in the UI. */
  label: string;
  /**
   * Disabled tools are fully written and type-checked, but are not offered to
   * the model. Flip this to `true` to switch one on — no other change needed.
   */
  enabled: boolean;
};

export const TOOL_REGISTRY: ToolMeta[] = [
  { name: "get-time", label: "Time", enabled: true },
  { name: "web-search", label: "Search", enabled: true },
  { name: "web-fetch", label: "Fetch", enabled: true },

  // Implemented but switched off. See each file in `lib/tools/server/`.
  { name: "weather", label: "Weather", enabled: false },
  { name: "generate-file", label: "File", enabled: false },
  { name: "generate-files", label: "Files", enabled: false },
  { name: "qr-code", label: "QR code", enabled: false },
];

/** Tools the model is currently allowed to call. */
export function enabledTools(): ToolMeta[] {
  return TOOL_REGISTRY.filter((tool) => tool.enabled);
}
