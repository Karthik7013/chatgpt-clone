/**
 * Tool names reach the UI in two shapes: a local tool arrives as
 * `tool-<name>`, and a tool the server had no types for arrives as
 * `dynamic-tool` carrying an explicit `toolName`. These two helpers turn
 * either shape into a plain name, and are the only place that knows about
 * those conventions.
 */

/**
 * Tool name for a message part: `web-fetch` for `tool-web-fetch`, the
 * declared name for `dynamic-tool`, and `unknown` if a dynamic part somehow
 * has no name.
 */
export function partToolName(part: { type: string; toolName?: string }): string {
  if (part.type === "dynamic-tool") return part.toolName ?? "unknown";
  return part.type.replace(/^tool-/, "");
}

/**
 * Base tool name, with any MCP server prefix removed. MCP namespaces its
 * tools as `<server>__<tool>`, so `local__get-time` and `get-time` must
 * resolve to the same card and the same citation handling.
 */
export function baseToolName(name: string): string {
  const separator = name.lastIndexOf("__");
  return separator === -1 ? name : name.slice(separator + 2);
}
