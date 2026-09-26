"use client";

import { useState } from "react";
import { Download, Copy, Check, QrCode, Loader2, AlertCircle } from "lucide-react";
import type { ToolCardProps } from "@/components/tool-cards/types";

type QrOutput = { qrCodeUrl?: string; content?: string; size?: number };

/** Card for the `qr-code` tool. Renders the generated image from a data URL. */
export function QrCard({ state, output, errorText }: ToolCardProps) {
  const [copied, setCopied] = useState(false);
  const data = output as QrOutput | undefined;

  function handleCopy() {
    if (!data?.qrCodeUrl) return;
    navigator.clipboard.writeText(data.qrCodeUrl).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      () => {},
    );
  }

  const size = data?.size ?? 300;

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

        {state === "output-available" && data?.qrCodeUrl && (
          <div className="flex flex-col gap-3">
            <div className="flex justify-center">
              <div className="rounded-lg border border-border bg-white p-3">
                {/* eslint-disable-next-line @next/next/no-img-element -- the QR code arrives as a runtime data URL, which next/image cannot optimize. */}
                <img
                  src={data.qrCodeUrl}
                  alt={`QR code for: ${data.content ?? ""}`}
                  width={size}
                  height={size}
                  className="block"
                  style={{ width: Math.min(size, 200), height: Math.min(size, 200) }}
                />
              </div>
            </div>

            <p
              className="truncate text-center text-xs text-muted-foreground"
              title={data.content}
            >
              {data.content}
            </p>

            <div className="flex justify-center gap-2">
              <a
                href={data.qrCodeUrl}
                download={`qrcode-${size}px.png`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface-2"
              >
                <Download className="size-3.5" />
                Download
              </a>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface-2"
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
