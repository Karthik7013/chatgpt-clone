"use client";

import { DownloadIcon, Loader2Icon, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ToolCardProps } from "@/components/tool-cards/types";

type FileInput = {
  filename?: string;
  files?: Array<{ filename: string }>;
};
type FileOutput = { filename?: string; downloadUrl?: string };

/**
 * Card for both file-generating tools (`generate-file` for one file,
 * `generate-files` for a zip). Input and output arrive untyped from the
 * stream, so both are narrowed here.
 */
export function FileCard({ state, input, output, errorText }: ToolCardProps) {
  const inData = input as FileInput | undefined;
  const outData = output as FileOutput | undefined;
  const filename = outData?.filename || inData?.filename || "file";

  if (state === "output-error") {
    return (
      <div className="overflow-hidden rounded-xl border border-danger/30 bg-danger/10">
        <div className="flex items-center gap-2 px-4 py-3">
          <FileText className="size-4 text-danger" />
          <span className="text-sm font-medium text-danger">
            Failed to generate {filename}
          </span>
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
    const loadingLabel = inData?.files
      ? `Generating ${inData.files.length} files…`
      : `Generating ${inData?.filename || "file"}…`;
    return (
      <div className="overflow-hidden rounded-xl border border-border bg-muted/30">
        <div className="flex items-center gap-2 px-4 py-3">
          <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{loadingLabel}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-4">
      <FileText className="size-6 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1 truncate text-sm font-medium">{filename}</span>
      {outData?.downloadUrl && (
        <Button variant="outline" asChild>
          <a href={outData.downloadUrl} target="_blank" rel="noopener noreferrer">
            <DownloadIcon className="size-3" />
            Download
          </a>
        </Button>
      )}
    </div>
  );
}
