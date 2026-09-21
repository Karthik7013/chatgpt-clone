"use client";

import { use } from "react";
import { ChatApp } from "@/components/chat";

export default function ChatPage({
  params,
}: {
  params: Promise<{ chatId: string }>;
}) {
  const { chatId } = use(params);
  return <ChatApp initialChatId={chatId} />;
}
