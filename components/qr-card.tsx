"use client";

import * as React from "react";
import { Download, Copy, Check, QrCode, Loader2, AlertCircle } from "lucide-react";
import type { ToolState } from "@/components/ai-elements/tool";

interface QrCardProps {
  state: ToolState;
  input?: { content: string; size?: number };
  output?: { qrCodeUrl: string; content: string; size: number };
  errorText?: string;
}

export function QrCard({ state, input, output, errorText }: QrCardProps) {
  const [copied, setCopied] = React.useState(false);

  function handleCopy() {
    if (!output) return;
    navigator.clipboard.writeText(output.qrCodeUrl).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      () => {},
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
        <QrCode className="size-4 text-purple-500" />
        <span className="text-sm font-medium">QR Code</span>
      </div>

      <div className="px-4 py-3">
        {state === "input-streaming" && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            <span>Generating QR code…</span>
          </div>
        )}

        {state === "output-error" && (
          <div className="flex items-center gap-2 text-sm text-red-500">
            <AlertCircle className="size-4" />
            <span>{errorText || "Failed to generate QR code"}</span>
          </div>
        )}

        {state === "output-available" && output && (
          <div className="space-y-3">
            <div className="flex justify-center">
              <div className="rounded-lg border border-border bg-white p-3">
                <img
                  src={output.qrCodeUrl}
                  alt={`QR code for: ${output.content}`}
                  width={output.size}
                  height={output.size}
                  className="block"
                  style={{ width: Math.min(output.size, 200), height: Math.min(output.size, 200) }}
                />
              </div>
            </div>

            <p className="truncate text-center text-xs text-muted-foreground" title={output.content}>
              {output.content}
            </p>

            <div className="flex justify-center gap-2">
              <a
                href={output.qrCodeUrl}
                download={`qrcode-${output.size}px.png`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium transition-colors hover:bg-surface-2"
              >
                <Download className="size-3.5" />
                Download
              </a>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium transition-colors hover:bg-surface-2"
              >
                {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                {copied ? "Copied" : "Copy Link"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
