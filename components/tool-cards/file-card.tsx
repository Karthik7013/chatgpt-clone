"use client";

import { FileIcon, DownloadIcon, Loader2Icon, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

type ToolState = "input-streaming" | "input-available" | "output-available" | "output-error";

interface FileCardProps {
  state: ToolState;
  input?: { filename: string; content: string; description?: string };
  output?: {
    filename: string;
    description: string;
    downloadUrl: string;
    size: number;
  };
  errorText?: string;
}

export function FileCard({ state, input, output, errorText }: FileCardProps) {
  const filename = output?.filename || input?.filename || "file";

  if (state === "output-error") {
    return (
      <div className="overflow-hidden rounded-xl border border-danger/30 bg-danger/10">
        <div className="flex items-center gap-2 px-4 py-3">
          <FileText className="size-4 text-danger" />
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
    <div className="flex p-4 items-center gap-2 rounded-xl border border-border bg-card ">
      <FileText className="size-6 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1 truncate text-sm font-medium">{filename}</span>
      <Button variant={'outline'} asChild>
        <a href={output?.downloadUrl} target="_blank" rel="noopener noreferrer">
          <DownloadIcon className="size-3" />
          Download
        </a>
      </Button>
    </div>
  );
}
