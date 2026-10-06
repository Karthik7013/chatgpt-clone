/** User-facing failure messages, kept together so they read consistently. */
export const CHAT_ERROR = {
  bootstrap:
    "Could not reach the database. Check that MONGODB_URI is set and reachable.",
  create: "Could not create a new chat.",
  rename: "Could not rename the chat.",
  remove: "Could not delete the chat.",
  renameFromMessage: "Could not update the chat.",
} as const;
