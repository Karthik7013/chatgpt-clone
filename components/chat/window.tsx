"use client";

import * as React from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { CircleAlert, Loader2, RotateCcw } from "lucide-react";

import { DEFAULT_MODEL_ID } from "@/lib/providers/provider-config";
import { friendlyError } from "@/lib/errors";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { EmptyHome } from "@/components/ai-elements/empty-home";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { MessageBubble } from "@/components/chat/message-bubble";
import { ChatComposer } from "@/components/chat/chat-composer";
import { useAttachmentUpload } from "@/components/chat/use-attachment-upload";
import {
  useAutosaveMessages,
  usePersistedMessages,
} from "@/components/chat/use-persisted-messages";

/**
 * Chat window for one conversation: loads the stored messages, then hands off
 * to `ChatSession` once they are available.
 */
export function ChatWindow({
  chatId,
  onFirstMessage,
}: {
  chatId: string;
  onFirstMessage: (message: UIMessage) => void;
}) {
  const { messages, loadFailed } = usePersistedMessages(chatId);

  if (messages === null) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <ChatSession
      chatId={chatId}
      initialMessages={messages}
      onFirstMessage={onFirstMessage}
      loadFailed={loadFailed}
    />
  );
}

/**
 * The live chat: the streaming conversation plus everything needed to send a
 * message. State lives here; the pieces it renders each own their own logic.
 */
function ChatSession({
  chatId,
  initialMessages,
  onFirstMessage,
  loadFailed,
}: {
  chatId: string;
  initialMessages: UIMessage[];
  onFirstMessage: (message: UIMessage) => void;
  loadFailed: boolean;
}) {
  const [input, setInput] = React.useState("");
  const [model, setModel] = React.useState(DEFAULT_MODEL_ID);
  const [webSearchEnabled, setWebSearchEnabled] = React.useState(true);
  const hasNotifiedFirstMessage = React.useRef(initialMessages.length > 0);

  const upload = useAttachmentUpload();

  const { messages, sendMessage, regenerate, status, error, stop, clearError } = useChat({
    id: chatId,
    messages: initialMessages,
    transport: new DefaultChatTransport({
      body: { model, webSearchEnabled },
    }),
  });

  const isBusy = status === "submitted" || status === "streaming";

  // Tell the parent about the first user message so it can name the chat.
  React.useEffect(() => {
    if (hasNotifiedFirstMessage.current) return;
    const firstUser = messages.find((m) => m.role === "user");
    if (!firstUser) return;
    hasNotifiedFirstMessage.current = true;
    onFirstMessage(firstUser);
  }, [messages, onFirstMessage]);

  const { saveError, dismissSaveError } = useAutosaveMessages({
    chatId,
    messages,
    enabled: !loadFailed,
  });

  function handleRetry() {
    if (isBusy) return;
    clearError();
    void regenerate();
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = input.trim();
    if ((!text && upload.files.length === 0) || isBusy) return;

    clearError();
    sendMessage({
      text: text || "Sent with attachments",
      files: upload.files.length > 0 ? upload.files : undefined,
    });
    setInput("");
    upload.clear();
  }

  const lastMessageId = messages.at(-1)?.id;
  const lastUserMessageId = React.useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "user") return messages[i].id;
    }
    return undefined;
  }, [messages]);

  return (
    <div className="flex h-full flex-col">
        <Conversation scrollKey={lastUserMessageId ?? "empty"}>
          <ConversationContent className="px-6">
            {messages.length === 0 ? (
              <EmptyHome />
            ) : (
              messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isStreamingTarget={isBusy && message.id === lastMessageId}
                />
              ))
            )}

            {status === "submitted" ? (
              <Shimmer className="py-2 text-sm" duration={2}>
                Generating response…
              </Shimmer>
            ) : null}

            {error && !isBusy ? (
              <div className="flex items-center gap-2 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
                <CircleAlert className="size-3.5 shrink-0" />
                <span className="flex-1">{friendlyError(error)}</span>
                <button
                  type="button"
                  onClick={handleRetry}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg bg-danger px-2.5 py-1.5 font-medium text-white transition-opacity hover:opacity-90"
                >
                  <RotateCcw className="size-3.5" />
                  Retry
                </button>
              </div>
            ) : null}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
    
      <ChatComposer
        input={input}
        onInputChange={setInput}
        onSubmit={handleSubmit}
        onStop={stop}
        status={status}
        isBusy={isBusy}
        files={upload.files}
        onRemoveFile={upload.remove}
        uploading={upload.uploading}
        onFilesChosen={(event) => void upload.uploadSelected(event.target.files)}
        openFilePicker={upload.openFilePicker}
        fileInputRef={upload.inputRef}
        model={model}
        onModelChange={setModel}
        webSearchEnabled={webSearchEnabled}
        onToggleWebSearch={() => setWebSearchEnabled((prev) => !prev)}
        saveError={saveError}
        onDismissSaveError={dismissSaveError}
        uploadError={upload.error}
      />
    </div>
  );
}
