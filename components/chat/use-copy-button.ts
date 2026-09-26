"use client";

import * as React from "react";

/**
 * Copy-to-clipboard with a temporary "Copied" state. Owns the reset timer and
 * clears it on unmount so a message scrolled out of the list mid-countdown
 * does not call setState after unmount.
 *
 * Falls back to a hidden textarea for browsers without the async clipboard
 * API, e.g. a non-secure origin.
 */
export function useCopyButton(): {
  copied: boolean;
  copy: (text: string) => Promise<void>;
} {
  const [copied, setCopied] = React.useState(false);
  const resetTimer = React.useRef<number | null>(null);

  React.useEffect(() => {
    return () => {
      if (resetTimer.current) window.clearTimeout(resetTimer.current);
    };
  }, []);

  async function copy(text: string) {
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

  return { copied, copy };
}
