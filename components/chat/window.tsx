"use client";

import * as React from "react";
import { useChat } from "@ai-sdk/react";
import type { UIMessage, FileUIPart } from "ai";
import { Check, CircleAlert, Copy, FileText, Globe, Loader2, RotateCcw } from "lucide-react";

import {
  loadMessages,
  saveMessages,
} from "@/lib/chat-store";
import { uploadFileToWorker, type UploadResult } from "@/lib/file-upload";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { EmptyHome } from "@/components/ai-elements/empty-home";
import { Message, MessageContent } from "@/components/ai-elements/message";
import { Response } from "@/components/ai-elements/response";
import { CitedResponse, type Citation } from "@/components/ai-elements/cited-response";
import { Reasoning, ReasoningContent, ReasoningTrigger } from "@/components/ai-elements/reasoning";
import { Tool, ToolContent, ToolHeader, ToolInput, ToolOutput, type ToolState } from "@/components/ai-elements/tool";
import { Sources } from "@/components/ai-elements/sources";
import { Shimmer } from "@/components/ai-elements/shimmer";
import {
  PromptInput,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputAttachButton,
  PromptInputAttachmentsDisplay,
  usePromptInputAttachments,
} from "@/components/ai-elements/prompt-input";
import {
  Attachments,
  Attachment,
  AttachmentPreview,
  AttachmentInfo,
  type AttachmentData,
} from "@/components/ai-elements/attachments";
import { ModelSelector } from "@/components/model-selector";
import { TimeCard } from "@/components/tool-cards/time-card";
import { WeatherCard } from "@/components/tool-cards/weather-card";
import { FileCard } from "@/components/tool-cards/file-card";
import { QrCard } from "@/components/tool-cards/qr-card";
import { WebFetchCard } from "@/components/tool-cards/web-fetch-card";
import { DefaultChatTransport } from "ai";

export function ChatWindow({
  chatId,
  onFirstMessage,
}: {
  chatId: string;
  onFirstMessage: (message: UIMessage) => void;
}) {
  const [seedMessages, setSeedMessages] = React.useState<UIMessage[] | null>(
    null,
  );

  React.useEffect(() => {
    let cancelled = false;
    loadMessages(chatId)
      .then((messages) => {
        if (!cancelled) setSeedMessages(messages);
      })
      .catch((err) => {
        console.error("Failed to load messages:", err);
        if (!cancelled) setSeedMessages([]);
      });
    return () => {
      cancelled = true;
    };
  }, [chatId]);

  if (seedMessages === null) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <ChatSession
      chatId={chatId}
      initialMessages={seedMessages}
      onFirstMessage={onFirstMessage}
    />
  );
}

function ChatSession({
  chatId,
  initialMessages,
  onFirstMessage,
}: {
  chatId: string;
  initialMessages: UIMessage[];
  onFirstMessage: (message: UIMessage) => void;
}) {
  const [input, setInput] = React.useState("");
  const [model, setModel] = React.useState("kilo:kilo-auto/free");
  const [webSearchEnabled, setWebSearchEnabled] = React.useState(true);
  const [pendingFiles, setPendingFiles] = React.useState<(FileUIPart & { id: string; tmpUrl: string })[]>([]);
  const [uploading, setUploading] = React.useState(false);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const hasNotifiedFirstMessage = React.useRef(initialMessages.length > 0);

  function getErrorMessage(err: unknown): string {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("429") || msg.includes("rate_limit") || msg.includes("quota")) {
      return "Rate limit exceeded. Try a different model or wait a moment.";
    }
    if (msg.includes("PERMISSION_DENIED") || msg.includes("403")) {
      return "API key error. Check your provider API key in .env.local.";
    }
    if (msg.includes("INVALID_ARGUMENT") || msg.includes("400")) {
      return "Invalid request. The prompt or file may be too large.";
    }
    if (msg.includes("UNAVAILABLE") || msg.includes("503")) {
      return "Service temporarily unavailable. Try again later.";
    }
    if (msg.includes("deadline_exceeded") || msg.includes("504")) {
      return "Request timed out. Try a shorter prompt or smaller file.";
    }
    return msg || "Something went wrong. Try again.";
  }

  const { messages, sendMessage, setMessages, regenerate, status, error, stop, clearError } = useChat({
    id: chatId,
    messages: initialMessages,
    transport: new DefaultChatTransport({
      body: { model, webSearchEnabled },
    }),
  });

  React.useEffect(() => {
    if (!hasNotifiedFirstMessage.current) {
      const firstUser = messages.find((m) => m.role === "user");
      if (firstUser) {
        hasNotifiedFirstMessage.current = true;
        onFirstMessage(firstUser);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  React.useEffect(() => {
    if (messages.length === 0) return;
    const timer = window.setTimeout(() => {
      void saveMessages(chatId, messages).catch((err) => {
        console.error("Failed to save messages:", err);
        setSaveError("Changes could not be saved to the database.");
      });
    }, 800);
    return () => window.clearTimeout(timer);
  }, [messages, chatId]);

  function handleRetry() {
    if (isBusy) return;
    clearError();
    void regenerate();
  }

  const isBusy = status === "submitted" || status === "streaming";

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const text = input.trim();
    if ((!text && pendingFiles.length === 0) || isBusy) return;
    clearError();
    sendMessage({
      text: text || (pendingFiles.length > 0 ? "Sent with attachments" : ""),
      files: pendingFiles.length > 0 ? pendingFiles : undefined,
    });
    setInput("");
    setPendingFiles([]);
  }

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    setUploading(true);
    try {
      const uploadPromises = Array.from(selectedFiles).map(async (file) => {
        const result: UploadResult = await uploadFileToWorker(file);
        return {
          type: "file" as const,
          id: result.itemId,
          filename: result.fileName,
          mediaType: file.type || "application/octet-stream",
          url: result.instantDownloadUrl,
          tmpUrl: result.instantTmpUrl || result.instantDownloadUrl,
        } satisfies FileUIPart & { id: string; tmpUrl: string };
      });

      const uploadedFiles = await Promise.all(uploadPromises);
      setPendingFiles((prev) => [...prev, ...uploadedFiles]);
    } catch (error) {
      console.error("Upload failed:", error);
      setUploadError(error instanceof Error ? error.message : "File upload failed");
      setTimeout(() => setUploadError(null), 5000);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function handleRemovePendingFile(id: string) {
    setPendingFiles((prev) => prev.filter((f) => f.id !== id));
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
        <ConversationContent>
          {messages.length === 0 ? (
            <EmptyHome />
          ) : (
            messages.map((message, i) => {
              return (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isStreamingTarget={isBusy && message.id === lastMessageId}
                />
              );
            })
          )}

          {status === "submitted" ? (
            <Shimmer className="py-2 text-sm" duration={2}>
              Generating response…
            </Shimmer>
          ) : null}
          {error && !isBusy ? (
            <div className="flex items-center gap-2 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
              <CircleAlert className="size-3.5 shrink-0" />
              <span className="flex-1">{getErrorMessage(error)}</span>
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

      <div className="mx-auto w-full max-w-3xl bg-background px-4 md:px-0 shadow-[0_-2px_8px_rgba(0,0,0,0.04)]">
        {saveError ? (
          <div className="flex items-center gap-2 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger mt-2">
            <CircleAlert className="size-3.5 shrink-0" />
            <span className="flex-1">{saveError}</span>
            <button
              type="button"
              onClick={() => setSaveError(null)}
              className="rounded hover:underline"
            >
              Dismiss
            </button>
          </div>
        ) : null}
        {uploadError &&
          <div className="flex items-center gap-2 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger mt-2">
            <CircleAlert className="size-3.5 shrink-0" />
            <span className="flex-1">{uploadError}</span>
          </div>
        }
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
        <PromptInput onSubmit={handleSubmit}>
          <PromptInputAttachmentsDisplay
            files={pendingFiles}
            onRemove={handleRemovePendingFile}
            uploading={uploading}
          />
          <PromptInputTextarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Message…"
            disabled={isBusy}
          />
          <PromptInputToolbar>
            <div className="flex items-center gap-1">
              <PromptInputAttachButton
                onClick={() => fileInputRef.current?.click()}
                disabled={isBusy || uploading}
              />
              <button
                type="button"
                onClick={() => setWebSearchEnabled(!webSearchEnabled)}
                title={webSearchEnabled ? "Web search: ON" : "Web search: OFF"}
                className={`rounded-md p-1.5 transition-colors ${webSearchEnabled ? "text-primary" : "text-muted-foreground hover:bg-surface-2"}`}
              >
                <Globe className="size-4" />
              </button>
              <ModelSelector model={model} onModelChange={setModel} />
            </div>
            <PromptInputSubmit status={status} disabled={uploading || (!input.trim() && pendingFiles.length === 0)} onStop={stop} />
          </PromptInputToolbar>
        </PromptInput>
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  isStreamingTarget,
}: {
  message: UIMessage;
  isStreamingTarget: boolean;
}) {
  const sources = message.parts
    .filter((p): p is Extract<UIMessage["parts"][number], { type: "source-url" }> => p.type === "source-url")
    .map((p) => ({ url: p.url, title: p.title }));

  const sourceDocs = message.parts
    .filter((p): p is Extract<UIMessage["parts"][number], { type: "source-document" }> => p.type === "source-document")
    .map((p) => ({ title: p.title, filename: p.filename, mediaType: p.mediaType }));

  // Extract web-search results for citation mapping
  const searchCitations: Citation[] = message.parts
    .filter((p): p is Extract<UIMessage["parts"][number], { type: `tool-web-search` }> =>
      (p.type === "tool-web-search" || p.type === "dynamic-tool") &&
      (p as unknown as { toolName?: string }).toolName === "web-search" &&
      (p as unknown as { state: string }).state === "output-available"
    )
    .flatMap((p) => {
      const output = (p as unknown as { output?: { results?: Array<{ index: number; url: string; title: string; domain: string }> } }).output;
      return output?.results ?? [];
    });

  const lastPartIndex = message.parts.length - 1;
  const [copied, setCopied] = React.useState(false);
  const copyTimer = React.useRef<number | null>(null);

  React.useEffect(() => {
    return () => {
      if (copyTimer.current) window.clearTimeout(copyTimer.current);
    };
  }, []);

  const copyText = message.parts
    .filter((p): p is Extract<UIMessage["parts"][number], { type: "text" }> => p.type === "text")
    .map((p) => p.text)
    .join("\n");

  async function handleCopy() {
    if (!copyText) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(copyText);
      } else {
        const ta = document.createElement("textarea");
        ta.value = copyText;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      if (copyTimer.current) window.clearTimeout(copyTimer.current);
      copyTimer.current = window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable; leave the button unchanged
    }
  }

  const copyButton = copyText ? (
    <button
      type="button"
      onClick={handleCopy}
      title={copied ? "Copied" : "Copy to clipboard"}
      aria-label={copied ? "Copied" : "Copy to clipboard"}
      className="rounded-md p-1.5 transition-colors hover:bg-surface-2 hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
    </button>
  ) : null;

  return (
    <Message role={message.role === "user" ? "user" : "assistant"}>
      <MessageContent role={message.role === "user" ? "user" : "assistant"}>
        <div className="flex flex-col gap-3">
          {message.parts.map((part, index) => {
            const isLastPart = index === lastPartIndex;
            const partIsStreaming = isStreamingTarget && isLastPart;

            if (part.type === "text") {
              if (!part.text) return null;
              return message.role === "user" ? (
                <p key={index} className="whitespace-pre-wrap">
                  {part.text}
                </p>
              ) : searchCitations.length > 0 ? (
                <CitedResponse key={index} citations={searchCitations}>{part.text}</CitedResponse>
              ) : (
                <Response key={index}>{part.text}</Response>
              );
            }

            if (part.type === "file") {
              const filePart = part as FileUIPart;
              const attachmentData: AttachmentData = {
                ...filePart,
                id: `file-${message.id}-${index}`,
              };
              return (
                <Attachments key={index} variant="grid" className="justify-start !ml-0">
                  <div className="flex w-16 flex-col items-start">
                    <Attachment
                      data={attachmentData}
                      onClick={() => filePart.url && window.open(filePart.url, "_blank")}
                      className="cursor-pointer"
                    >
                      <AttachmentPreview />
                    </Attachment>
                    <span className="w-full truncate pt-1 text-left text-xs text-muted-foreground">
                      {filePart.filename || "File"}
                    </span>
                  </div>
                </Attachments>
              );
            }

            if (part.type === "reasoning") {
              if (!part.text) return null;
              return (
                <Reasoning key={index} isStreaming={partIsStreaming}>
                  <ReasoningTrigger />
                  <ReasoningContent>{part.text}</ReasoningContent>
                </Reasoning>
              );
            }

            if (part.type.startsWith("tool-") || part.type === "dynamic-tool") {
              const toolPart = part as unknown as {
                type: string;
                toolName?: string;
                state: ToolState;
                input?: unknown;
                output?: unknown;
                errorText?: string;
              };
              const typeLabel =
                part.type === "dynamic-tool" ? `tool-${toolPart.toolName ?? "unknown"}` : part.type;
              const toolName =
                part.type === "dynamic-tool"
                  ? (toolPart.toolName ?? "unknown")
                  : typeLabel.replace(/^tool-/, "");
              // Rich cards for known tools (generative UI); every other
              // tool keeps the generic collapsible renderer below.
              if (toolName === "weather") {
                return (
                  <WeatherCard
                    key={index}
                    type={typeLabel}
                    state={toolPart.state}
                    input={toolPart.input}
                    output={toolPart.output}
                    errorText={toolPart.errorText}
                  />
                );
              }
              // MCP tools arrive namespaced as <server>__get-time.
              if (toolName === "get-time" || toolName.endsWith("__get-time")) {
                return (
                  <TimeCard
                    key={index}
                    type={typeLabel}
                    state={toolPart.state}
                    input={toolPart.input}
                    output={toolPart.output}
                    errorText={toolPart.errorText}
                  />
                );
              }
              if (toolName === "generate-file") {
                return (
                  <FileCard
                    key={index}
                    state={toolPart.state}
                    input={toolPart.input as { filename: string; content: string; description?: string } | undefined}
                    output={toolPart.output as { filename: string; description: string; downloadUrl: string; size: number } | undefined}
                    errorText={toolPart.errorText}
                  />
                );
              }
              if (toolName === "generate-files") {
                return (
                  <FileCard
                    key={index}
                    state={toolPart.state}
                    input={toolPart.input as { filename?: string; files?: Array<{ filename: string; content: string }>; description?: string } | undefined}
                    output={toolPart.output as { filename: string; description: string; downloadUrl: string; size: number } | undefined}
                    errorText={toolPart.errorText}
                  />
                );
              }
              if (toolName === "qr-code") {
                return (
                  <QrCard
                    key={index}
                    state={toolPart.state}
                    input={toolPart.input as { content: string; size?: number } | undefined}
                    output={toolPart.output as { qrCodeUrl: string; content: string; size: number } | undefined}
                    errorText={toolPart.errorText}
                  />
                );
              }
              if (toolName === "web-fetch") {
                return (
                  <WebFetchCard
                    key={index}
                    state={toolPart.state}
                    input={toolPart.input as { url: string; format?: string } | undefined}
                    output={toolPart.output as { url: string; content: string; type: string } | undefined}
                    errorText={toolPart.errorText}
                  />
                );
              }
              // Force the card open while the tool is executing so the
              // Preparing/Running loading state is visible. Falls back to
              // uncontrolled (user toggle + auto-open on error) once done.
              const isLive =
                isStreamingTarget &&
                (toolPart.state === "input-streaming" ||
                  toolPart.state === "input-available");
              return (
                <Tool
                  key={index}
                  defaultOpen={toolPart.state === "output-error"}
                  open={isLive ? true : undefined}
                >
                  <ToolHeader type={typeLabel} state={toolPart.state} />
                  <ToolContent>
                    <ToolInput input={toolPart.input} />
                    <ToolOutput output={toolPart.output} errorText={toolPart.errorText} />
                  </ToolContent>
                </Tool>
              );
            }

            return null;
          })}
          {sources.length > 0 ? <Sources sources={sources} /> : null}
          {sourceDocs.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {sourceDocs.map((doc, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-1 text-xs text-muted-foreground"
                >
                  <FileText className="size-3" />
                  {doc.title || doc.filename || "Document"}
                </span>
              ))}
            </div>
          ) : null}
          {message.role === "assistant" ? (
            <div className="flex items-center gap-1 pt-1 text-muted-foreground">
              {copyButton}
            </div>
          ) : null}
        </div>
      </MessageContent>
      {message.role === "user" && copyButton ? (
        <div className="flex items-center gap-1 text-muted-foreground">
          {copyButton}
        </div>
      ) : null}
    </Message>
  );
}
