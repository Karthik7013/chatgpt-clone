"use client";

import { FileCodeIcon, DownloadIcon, Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";

type ToolState = "input-streaming" | "input-available" | "output-available" | "output-error";

interface FileCardProps {
  state: ToolState;
  input?: { filename: string; content: string; description?: string };
  output?: {
    filename: string;
    description: string;
    downloadUrl: string;
    publicUrl: string;
    detailsUrl: string;
    size: number;
  };
  errorText?: string;
}

function getFileIcon(filename: string) {
  const ext = filename.split(".").pop()?.toLowerCase();
  const iconMap: Record<string, string> = {
    js: "\u{1F4DC}",
    jsx: "\u{269B}\u{FE0F}",
    ts: "\u{1F4D8}",
    tsx: "\u{269B}\u{FE0F}",
    py: "\u{1F40D}",
    java: "\u{2615}",
    go: "\u{1F535}",
    rs: "\u{1F980}",
    html: "\u{1F310}",
    css: "\u{1F3A8}",
    json: "\u{1F4CB}",
    md: "\u{1F4DD}",
    yaml: "\u{2699}\u{FE0F}",
    yml: "\u{2699}\u{FE0F}",
    toml: "\u{2699}\u{FE0F}",
    sh: "\u{1F5A5}\u{FE0F}",
    bash: "\u{1F5A5}\u{FE0F}",
    txt: "\u{1F4C4}",
    csv: "\u{1F4CA}",
    xml: "\u{1F4F1}",
  };
  return iconMap[ext || ""] || "\u{1F4C4}";
}

function getFileExtension(filename: string) {
  return filename.split(".").pop()?.toLowerCase() || "";
}

export function FileCard({ state, input, output, errorText }: FileCardProps) {
  const filename = output?.filename || input?.filename || "file";
  const description = output?.description || input?.description || "";
  const icon = getFileIcon(filename);
  const ext = getFileExtension(filename);

  if (state === "output-error") {
    return (
      <div className="overflow-hidden rounded-xl border border-danger/30 bg-danger/10">
        <div className="flex items-center gap-2 px-4 py-3">
          <FileCodeIcon className="size-4 text-danger" />
          <span className="text-sm font-medium text-danger">Failed to generate {filename}</span>
        </div>
        {errorText && (
          <div className="border-t border-danger/20 px-4 py-2">
            <p className="text-xs text-danger/80">{errorText}</p>
          </div>
        )}
      </div>
    );
  }

  if (state !== "output-available") {
    return (
      <div className="overflow-hidden rounded-xl border border-border bg-muted/30">
        <div className="flex items-center gap-2 px-4 py-3">
          <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Generating {input?.filename || "file"}...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <span className="text-xl">{icon}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium">{filename}</span>
            {ext && (
              <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
                {ext}
              </span>
            )}
          </div>
          {description && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        {output?.size != null && (
          <span className="shrink-0 text-xs text-muted-foreground">
            {output.size < 1024
              ? `${output.size} B`
              : `${(output.size / 1024).toFixed(1)} KB`}
          </span>
        )}
      </div>

      {input?.content && (
        <div className="border-b border-border bg-muted/20 px-4 py-3">
          <pre className="max-h-32 overflow-auto font-mono text-xs leading-relaxed text-muted-foreground">
            {input.content.split("\n").slice(0, 8).join("\n")}
            {input.content.split("\n").length > 8 && (
              <span className="text-muted-foreground/60">{"\n"}...</span>
            )}
          </pre>
        </div>
      )}

      <div className="flex items-center gap-2 bg-muted/10 px-4 py-2.5">
        <Button size="sm" className="h-7 gap-1.5 text-xs" asChild>
          <a href={output?.downloadUrl} target="_blank" rel="noopener noreferrer">
            <DownloadIcon className="size-3" />
            Download
          </a>
        </Button>
      </div>
    </div>
  );
}
