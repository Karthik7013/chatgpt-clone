"use client";

import * as React from "react";
import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { Check, ChevronLeft, ChevronRight, CircleAlert, Copy, RotateCcw } from "lucide-react";

import {
  loadMessages,
  loadVersions,
  saveMessages,
  saveVersions,
  type VersionState,
} from "@/lib/chat-store";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { EmptyHome } from "@/components/ai-elements/empty-home";
import { Message, MessageContent } from "@/components/ai-elements/message";
import { Response } from "@/components/ai-elements/response";
import { Reasoning, ReasoningContent, ReasoningTrigger } from "@/components/ai-elements/reasoning";
import { Tool, ToolContent, ToolHeader, ToolInput, ToolOutput, type ToolState } from "@/components/ai-elements/tool";
import { Sources } from "@/components/ai-elements/sources";
import { Shimmer } from "@/components/ai-elements/shimmer";
import {
  PromptInput,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
} from "@/components/ai-elements/prompt-input";
import { ModelSelector } from "@/components/ui/model-selector";
import { DefaultChatTransport } from "ai";

export function ChatWindow({
  chatId,
  onFirstMessage,
}: {
  chatId: string;
  onFirstMessage: (message: UIMessage) => void;
}) {
  const [input, setInput] = React.useState("");
  const [model, setModel] = React.useState("gemini-2.5-flash");
  const initialMessages = React.useMemo(() => loadMessages(chatId), [chatId]);
  const hasNotifiedFirstMessage = React.useRef(initialMessages.length > 0);
  const [versionState, setVersionState] = React.useState<VersionState>(() => loadVersions(chatId));
  // User message id currently awaiting a regenerated response.
  const pendingRegenRef = React.useRef<string | null>(null);

  const handleFinish = React.useCallback(
    ({ message, messages: finishedMessages }: { message: UIMessage; messages: UIMessage[] }) => {
      const target = pendingRegenRef.current;
      pendingRegenRef.current = null;
      const lastUser = [...finishedMessages].reverse().find((m) => m.role === "user");

      if (target && lastUser?.id === target) {
        // Regenerated response: append as a new version of the same prompt.
        setVersionState((prev) => {
          const list = prev.versions[target] ?? [];
          if (list.some((m) => m.id === message.id)) return prev;
          const next = [...list, message];
          return {
            versions: { ...prev.versions, [target]: next },
            active: { ...prev.active, [target]: next.length - 1 },
          };
        });
        return;
      }

      // Fresh exchange: track the first response for this prompt.
      if (!lastUser) return;
      const uid = lastUser.id;
      setVersionState((prev) => {
        if (prev.versions[uid]) return prev;
        return {
          versions: { ...prev.versions, [uid]: [message] },
          active: { ...prev.active, [uid]: 0 },
        };
      });
    },
    [],
  );

  const { messages, sendMessage, setMessages, regenerate, status, error, stop, clearError } = useChat({
    id: chatId,
    messages: initialMessages,
    transport: new DefaultChatTransport({
      body: { model },
    }),
    onFinish: handleFinish,
  });

  React.useEffect(() => {
    saveMessages(chatId, messages);
    if (!hasNotifiedFirstMessage.current) {
      const firstUser = messages.find((m) => m.role === "user");
      if (firstUser) {
        hasNotifiedFirstMessage.current = true;
        onFirstMessage(firstUser);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, chatId]);

  React.useEffect(() => {
    saveVersions(chatId, versionState);
  }, [chatId, versionState]);

  function handleRetry() {
    const target = pendingRegenRef.current ?? lastUserMessageId;
    if (!target || isBusy) return;
    clearError();
    if (pendingRegenRef.current) {
      // A regeneration was in flight — retrigger it directly.
      void regenerate();
    } else {
      // Re-send the last prompt; success is stored as a version.
      handleRegenerate(target);
    }
  }

  // Fire the regeneration only after the truncation has committed to state,
  // so regenerate() reads the truncated history instead of the stale one.
  React.useEffect(() => {
    const target = pendingRegenRef.current;
    if (!target || isBusy) return;
    const last = messages.at(-1);
    if (last?.id === target && last.role === "user") {
      void regenerate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  const isBusy = status === "submitted" || status === "streaming";

  function handleRegenerate(userId: string) {
    if (isBusy) return;
    const idx = messages.findIndex((m) => m.id === userId && m.role === "user");
    if (idx < 0) return;
    const current = messages[idx + 1];
    // Stash the visible response as a version before replacing it.
    setVersionState((prev) => {
      const list = [...(prev.versions[userId] ?? [])];
      if (current?.role === "assistant" && !list.some((m) => m.id === current.id)) {
        list.push(current);
      }
      return {
        versions: { ...prev.versions, [userId]: list },
        active: { ...prev.active, [userId]: Math.max(list.length - 1, 0) },
      };
    });
    // Fork the thread: drop everything after this prompt, then regenerate.
    setMessages(messages.slice(0, idx + 1));
    pendingRegenRef.current = userId;
  }

  function showVersion(userId: string, dir: 1 | -1) {
    if (isBusy) return;
    const list = versionState.versions[userId];
    if (!list || list.length < 2) return;
    const cur = Math.min(versionState.active[userId] ?? 0, list.length - 1);
    const next = cur + dir;
    if (next < 0 || next >= list.length) return;
    const idx = messages.findIndex((m) => m.id === userId && m.role === "user");
    const slot = idx >= 0 ? messages[idx + 1] : undefined;
    if (idx < 0 || slot?.role !== "assistant") return;
    const copy = [...messages];
    copy[idx + 1] = list[next];
    setMessages(copy);
    setVersionState((prev) => ({
      ...prev,
      active: { ...prev.active, [userId]: next },
    }));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const text = input.trim();
    if (!text || isBusy) return;
    clearError();
    sendMessage({ text });
    setInput("");
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
            <EmptyHome onSuggest={setInput} />
          ) : (
            messages.map((message, i) => {
              const prev = i > 0 ? messages[i - 1] : undefined;
              const promptId =
                message.role === "assistant" && prev?.role === "user" ? prev.id : undefined;
              const list = promptId ? versionState.versions[promptId] : undefined;
              const activeIdx = promptId ? (versionState.active[promptId] ?? 0) : 0;
              return (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isStreamingTarget={isBusy && message.id === lastMessageId}
                  versionControls={
                    promptId
                      ? {
                          index: Math.min(activeIdx, Math.max((list?.length ?? 1) - 1, 0)),
                          total: list?.length ?? 1,
                          disabled: isBusy,
                          onPrev: () => showVersion(promptId, -1),
                          onNext: () => showVersion(promptId, 1),
                          onRegenerate: () => handleRegenerate(promptId),
                        }
                      : undefined
                  }
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
              <span className="flex-1">{error.message || "Something went wrong. Try again."}</span>
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

      <div className="mx-auto w-full max-w-3xl px-4 pb-4">
        <PromptInput onSubmit={handleSubmit}>
          <PromptInputTextarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Message Gemini…"
            disabled={isBusy}
          />
          <PromptInputToolbar>
            <ModelSelector model={model} onModelChange={setModel} />
            <PromptInputSubmit status={status} disabled={!input.trim()} onStop={stop} />
          </PromptInputToolbar>
        </PromptInput>
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  isStreamingTarget,
  versionControls,
}: {
  message: UIMessage;
  isStreamingTarget: boolean;
  versionControls?: {
    index: number;
    total: number;
    disabled: boolean;
    onPrev: () => void;
    onNext: () => void;
    onRegenerate: () => void;
  };
}) {
  const sources = message.parts
    .filter((p): p is Extract<UIMessage["parts"][number], { type: "source-url" }> => p.type === "source-url")
    .map((p) => ({ url: p.url, title: p.title }));

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
              ) : (
                <Response key={index}>{part.text}</Response>
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
              return (
                <Tool key={index} defaultOpen={toolPart.state === "output-error"}>
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
          {message.role === "assistant" && versionControls ? (
            <div className="flex items-center gap-1 pt-1 text-muted-foreground">
              {copyButton}
              <button
                type="button"
                onClick={versionControls.onRegenerate}
                disabled={versionControls.disabled}
                title="Regenerate response"
                aria-label="Regenerate response"
                className="rounded-md p-1.5 transition-colors hover:bg-surface-2 hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
              >
                <RotateCcw className="size-3.5" />
              </button>
              {versionControls.total > 1 ? (
                <span className="flex items-center gap-0.5 text-xs">
                  <button
                    type="button"
                    onClick={versionControls.onPrev}
                    disabled={versionControls.disabled || versionControls.index === 0}
                    aria-label="Previous response"
                    className="rounded-md p-1.5 transition-colors hover:bg-surface-2 hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
                  >
                    <ChevronLeft className="size-3.5" />
                  </button>
                  <span className="min-w-8 text-center tabular-nums">
                    {versionControls.index + 1} / {versionControls.total}
                  </span>
                  <button
                    type="button"
                    onClick={versionControls.onNext}
                    disabled={
                      versionControls.disabled ||
                      versionControls.index === versionControls.total - 1
                    }
                    aria-label="Next response"
                    className="rounded-md p-1.5 transition-colors hover:bg-surface-2 hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
                  >
                    <ChevronRight className="size-3.5" />
                  </button>
                </span>
              ) : null}
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
