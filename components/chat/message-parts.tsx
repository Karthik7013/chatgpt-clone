"use client";

import * as React from "react";
import type { FileUIPart, UIMessage } from "ai";
import { FileText } from "lucide-react";

import {
  extractSearchCitations,
  extractSourceDocuments,
  extractSources,
  type SourceFile,
} from "@/lib/message-parts";
import { Response } from "@/components/ai-elements/response";
import { CitedResponse } from "@/components/ai-elements/cited-response";
import { Reasoning, ReasoningContent, ReasoningTrigger } from "@/components/ai-elements/reasoning";
import { Sources } from "@/components/ai-elements/sources";
import {
  Attachments,
  Attachment,
  AttachmentPreview,
  type AttachmentData,
} from "@/components/ai-elements/attachments";
import { ToolPart, type ToolPartLike } from "@/components/chat/tool-part";

/**
 * Renders a message's parts. Split from `MessageBubble` so the per-part
 * dispatch reads as a list of cases rather than being buried in the layout.
 */
export function MessageParts({
  message,
  isStreamingTarget,
}: {
  message: UIMessage;
  isStreamingTarget: boolean;
}) {
  const sources = React.useMemo(
    () => extractSources(message.parts),
    [message.parts],
  );
  const sourceDocs = React.useMemo(
    () => extractSourceDocuments(message.parts),
    [message.parts],
  );
  const citations = React.useMemo(
    () => extractSearchCitations(message.parts),
    [message.parts],
  );
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
