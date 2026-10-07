"use client";

import * as React from "react";
import type { UIMessage } from "ai";
import { Check, Copy } from "lucide-react";

import { extractMessageText } from "@/lib/message-parts";
import { Message, MessageContent } from "@/components/ai-elements/message";
import { MessageParts } from "@/components/chat/message-parts";

/**
 * Renders one chat message: its parts in order, the cited sources that belong
 * to it, and a copy button. The only state in this file is the copy button's
 * "Copied" flag; everything else is derived from the message.
 */
export function MessageBubble({
  message,
  isStreamingTarget,
}: {
  message: UIMessage;
  isStreamingTarget: boolean;
}) {
  const copyText = React.useMemo(
    () => extractMessageText(message.parts),
    [message.parts],
  );

  return (
    <Message role={message.role === "user" ? "user" : "assistant"}>
      <MessageContent role={message.role === "user" ? "user" : "assistant"}>
        <div className="flex flex-col gap-3">
          <MessageParts message={message} isStreamingTarget={isStreamingTarget} />
          {message.role === "assistant" ? (
            <div className="flex items-center gap-1 pt-1 text-muted-foreground">
              {copyText ? <CopyButton text={copyText} /> : null}
            </div>
          ) : null}
        </div>
      </MessageContent>
      {message.role === "user" && copyText ? (
        <div className="flex items-center gap-1 text-muted-foreground">
          <CopyButton text={copyText} />
        </div>
      ) : null}
    </Message>
  );
}

/**
 * Copy-to-clipboard with a temporary "Copied" state. Owns the reset timer
 * and clears it on unmount so a message scrolled out of the list
 * mid-countdown does not call setState after unmount.
 *
 * Falls back to a hidden textarea for browsers without the async clipboard
 * API, e.g. a non-secure origin.
 */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = React.useState(false);
  const resetTimer = React.useRef<number | null>(null);

  React.useEffect(() => {
    return () => {
      if (resetTimer.current) window.clearTimeout(resetTimer.current);
    };
  }, []);

  async function onCopy() {
    if (!text) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const scratch = document.createElement("textarea");
        scratch.value = text;
        document.body.appendChild(scratch);
        scratch.select();
        document.execCommand("copy");
        document.body.removeChild(scratch);
      }
      setCopied(true);
      if (resetTimer.current) window.clearTimeout(resetTimer.current);
      resetTimer.current = window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked by the browser; leave the button unchanged so the
      // user does not see a "Copied" confirmation that did not happen.
    }
  }

  return (
    <button
      type="button"
      onClick={() => void onCopy()}
      title={copied ? "Copied" : "Copy to clipboard"}
      aria-label={copied ? "Copied" : "Copy to clipboard"}
      className="rounded-md p-1.5 transition-colors hover:bg-surface-2 hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
    </button>
  );
}
