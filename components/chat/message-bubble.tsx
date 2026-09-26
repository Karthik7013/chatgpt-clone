"use client";

import * as React from "react";
import { createElement } from "react";
import type { FileUIPart, UIMessage } from "ai";
import { Check, Copy, FileText } from "lucide-react";

import {
  extractMessageText,
  extractSearchCitations,
  extractSourceDocuments,
  extractSources,
  type SourceFile,
} from "@/lib/message-parts";
import { Message, MessageContent } from "@/components/ai-elements/message";
import { Response } from "@/components/ai-elements/response";
import { CitedResponse } from "@/components/ai-elements/cited-response";
import { Reasoning, ReasoningContent, ReasoningTrigger } from "@/components/ai-elements/reasoning";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
  type ToolState,
} from "@/components/ai-elements/tool";
import { Sources } from "@/components/ai-elements/sources";
import {
  Attachments,
  Attachment,
  AttachmentPreview,
  type AttachmentData,
} from "@/components/ai-elements/attachments";
import { baseToolName, partToolName } from "@/lib/tool-names";
import { toolCardFor } from "@/components/tool-cards/registry";
import { useCopyButton } from "@/components/chat/use-copy-button";

/**
 * Renders one chat message: its parts in order, the cited sources that belong
 * to it, and a copy button. The only state it owns is the copy button's
 * "Copied" flag; everything else is derived from the message.
 */
export function MessageBubble({
  message,
  isStreamingTarget,
}: {
  message: UIMessage;
  isStreamingTarget: boolean;
}) {
  const { copied, copy } = useCopyButton();
  const copyText = extractMessageText(message.parts);

  const copyButton = copyText ? (
    <button
      type="button"
      onClick={() => void copy(copyText)}
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
          <MessageParts message={message} isStreamingTarget={isStreamingTarget} />
          {message.role === "assistant" ? (
            <div className="flex items-center gap-1 pt-1 text-muted-foreground">
              {copyButton}
            </div>
          ) : null}
        </div>
      </MessageContent>
      {message.role === "user" && copyButton ? (
        <div className="flex items-center gap-1 text-muted-foreground">{copyButton}</div>
      ) : null}
    </Message>
  );
}

/**
 * Renders a message's parts. Split from `MessageBubble` so the per-part
 * dispatch reads as a list of cases rather than being buried in the layout.
 */
function MessageParts({
  message,
  isStreamingTarget,
}: {
  message: UIMessage;
  isStreamingTarget: boolean;
}) {
  const sources = extractSources(message.parts);
  const sourceDocs = extractSourceDocuments(message.parts);
  const citations = extractSearchCitations(message.parts);
  const lastPartIndex = message.parts.length - 1;

  return (
    <>
      {message.parts.map((part, index) => {
        const isLastPart = index === lastPartIndex;
        const isStreaming = isStreamingTarget && isLastPart;

        if (part.type === "text") {
          if (!part.text) return null;
          if (message.role === "user") {
            return (
              <p key={index} className="whitespace-pre-wrap">
                {part.text}
              </p>
            );
          }
          return citations.length > 0 ? (
            <CitedResponse key={index} citations={citations}>
              {part.text}
            </CitedResponse>
          ) : (
            <Response key={index}>{part.text}</Response>
          );
        }

        if (part.type === "file") {
          return <FileAttachment key={index} part={part} messageId={message.id} index={index} />;
        }

        if (part.type === "reasoning") {
          if (!part.text) return null;
          return (
            <Reasoning key={index} isStreaming={isStreaming}>
              <ReasoningTrigger />
              <ReasoningContent>{part.text}</ReasoningContent>
            </Reasoning>
          );
        }

        if (part.type.startsWith("tool-") || part.type === "dynamic-tool") {
          return (
            <ToolPart
              key={index}
              part={part as unknown as ToolPartLike}
              isStreamingTarget={isStreamingTarget && isStreaming}
            />
          );
        }

        return null;
      })}

      {sources.length > 0 ? <Sources sources={sources} /> : null}
      {sourceDocs.length > 0 ? <SourceDocChips docs={sourceDocs} /> : null}
    </>
  );
}

/** A tool result, as it reaches the UI. `input`/`output` are tool-specific. */
type ToolPartLike = {
  type: string;
  toolName?: string;
  state: ToolState;
  input?: unknown;
  output?: unknown;
  errorText?: string;
};

function ToolPart({
  part,
  isStreamingTarget,
}: {
  part: ToolPartLike;
  isStreamingTarget: boolean;
}) {
  const toolName = partToolName(part);
  // The generic header labels the tool from this string, so it keeps the
  // `tool-` prefix that MCP names do not carry.
  const typeLabel =
    part.type === "dynamic-tool" ? `tool-${part.toolName ?? "unknown"}` : part.type;

  // Known tools get a rich card. The lookup uses the base name because MCP
  // namespaces tools as `<server>__<tool>`, and both spellings should resolve
  // to the same card. Unknown tools fall through to the generic renderer.
  //
  // createElement rather than `<Card />`: the card comes from a module-level
  // registry, so it is a fixed component and not one created per render.
  const Card = toolCardFor(baseToolName(toolName));
  if (Card) {
    return createElement(Card, {
      name: toolName,
      state: part.state,
      input: part.input,
      output: part.output,
      errorText: part.errorText,
    });
  }

  // Force the generic card open while the tool runs so the Preparing/Running
  // state is visible, then hand control back to the user.
  const isLive =
    isStreamingTarget &&
    (part.state === "input-streaming" || part.state === "input-available");

  return (
    <Tool defaultOpen={part.state === "output-error"} open={isLive ? true : undefined}>
      <ToolHeader type={typeLabel} state={part.state} />
      <ToolContent>
        <ToolInput input={part.input} />
        <ToolOutput output={part.output} errorText={part.errorText} />
      </ToolContent>
    </Tool>
  );
}

function FileAttachment({
  part,
  messageId,
  index,
}: {
  part: FileUIPart;
  messageId: string;
  index: number;
}) {
  const data: AttachmentData = {
    ...part,
    id: `file-${messageId}-${index}`,
  };
  return (
    <Attachments variant="grid" className="justify-start !ml-0">
      <div className="flex w-16 flex-col items-start">
        <Attachment
          data={data}
          onClick={() => part.url && window.open(part.url, "_blank")}
          className="cursor-pointer"
        >
          <AttachmentPreview />
        </Attachment>
        <span className="w-full truncate pt-1 text-left text-xs text-muted-foreground">
          {part.filename || "File"}
        </span>
      </div>
    </Attachments>
  );
}

function SourceDocChips({ docs }: { docs: SourceFile[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {docs.map((doc, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-1 text-xs text-muted-foreground"
        >
          <FileText className="size-3" />
          {doc.title || doc.filename || "Document"}
        </span>
      ))}
    </div>
  );
}
