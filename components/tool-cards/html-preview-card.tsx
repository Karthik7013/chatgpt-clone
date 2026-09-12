"use client";

import * as React from "react";
import { Download, Code, Loader2, AlertCircle } from "lucide-react";
import { Response } from "@/components/ai-elements/response";
import type { ToolState } from "@/components/ai-elements/tool";

interface HtmlPreviewCardProps {
  state: ToolState;
  input?: { html: string; width?: number; height?: number };
  output?: { screenshotUrl: string; width: number; height: number; size: number };
  errorText?: string;
}

export function HtmlPreviewCard({ state, input, output, errorText }: HtmlPreviewCardProps) {
  const [activeTab, setActiveTab] = React.useState<"preview" | "code">("preview");

  function handleDownload() {
    if (!output) return;
    const a = document.createElement("a");
    a.href = output.screenshotUrl;
    a.download = `html-preview-${output.width}x${output.height}.png`;
    a.click();
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
        <Code className="size-4 text-green-500" />
        <span className="text-sm font-medium">HTML Preview</span>
        {state === "output-available" && output && (
          <>
            <div className="ml-auto flex gap-1">
              <button
                type="button"
                onClick={() => setActiveTab("preview")}
                className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${activeTab === "preview" ? "bg-surface-2 text-foreground" : "text-muted-foreground hover:bg-surface-2"}`}
              >
                Preview
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("code")}
                className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${activeTab === "code" ? "bg-surface-2 text-foreground" : "text-muted-foreground hover:bg-surface-2"}`}
              >
                Code
              </button>
            </div>
            <span className="text-xs text-muted-foreground">
              {output.width} × {output.height}
            </span>
          </>
        )}
      </div>

      <div className="px-4 py-3">
        {state === "input-streaming" && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            <span>Rendering HTML…</span>
          </div>
        )}

        {state === "output-error" && (
          <div className="flex items-center gap-2 text-sm text-red-500">
            <AlertCircle className="size-4" />
            <span>{errorText || "Failed to render HTML"}</span>
          </div>
        )}

        {state === "output-available" && output && (
          <div className="space-y-3">
            {activeTab === "preview" && (
              <div className="max-h-[500px] overflow-y-auto rounded-lg border border-border bg-white">
                <img
                  src={output.screenshotUrl}
                  alt="HTML Preview"
                  className="block w-full"
                />
              </div>
            )}

            {activeTab === "code" && input?.html && (
              <div className="max-h-[500px] overflow-y-auto rounded-lg border border-border">
                <Response>{`\`\`\`html\n${input.html}\n\`\`\``}</Response>
              </div>
            )}

            <div className="flex justify-center gap-2">
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium transition-colors hover:bg-surface-2"
              >
                <Download className="size-3.5" />
                Download
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
