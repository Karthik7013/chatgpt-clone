"use client";

import type * as React from "react";
import type { ChatStatus } from "ai";
import { CircleAlert, Globe } from "lucide-react";

import {
  PromptInput,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputAttachButton,
  PromptInputAttachmentsDisplay,
} from "@/components/ai-elements/prompt-input";
import { ModelSelector } from "@/components/model-selector";
import type { PendingFile } from "@/components/chat/use-attachment-upload";

/** The message box, its toolbar, and the banners that sit just above it. */
export function ChatComposer({
  input,
  onInputChange,
  onSubmit,
  onStop,
  status,
  files,
  onRemoveFile,
  uploading,
  onFilesChosen,
  openFilePicker,
  fileInputRef,
  model,
  onModelChange,
  webSearchEnabled,
  onToggleWebSearch,
  saveError,
  onDismissSaveError,
  uploadError,
  isBusy,
}: {
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onStop: () => void;
  status: ChatStatus;
  files: PendingFile[];
  onRemoveFile: (id: string) => void;
  uploading: boolean;
  onFilesChosen: (event: React.ChangeEvent<HTMLInputElement>) => void;
  openFilePicker: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  model: string;
  onModelChange: (model: string) => void;
  webSearchEnabled: boolean;
  onToggleWebSearch: () => void;
  saveError: string | null;
  onDismissSaveError: () => void;
  uploadError: string | null;
  isBusy: boolean;
}) {
  const nothingToSend = input.trim() === "" && files.length === 0;

  return (
    <div className="mx-auto w-full max-w-3xl bg-background md:px-0 shadow-[0_-2px_8px_rgba(0,0,0,0.04)]">
      {saveError ? (
        <ErrorBanner message={saveError}>
          <button type="button" onClick={onDismissSaveError} className="rounded hover:underline">
            Dismiss
          </button>
        </ErrorBanner>
      ) : null}
      {uploadError ? <ErrorBanner message={uploadError} /> : null}

      {/* Kept outside PromptInput so it is never submitted as a form value. */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={onFilesChosen}
        className="hidden"
      />

      <PromptInput onSubmit={onSubmit}>
        <PromptInputAttachmentsDisplay files={files} onRemove={onRemoveFile} uploading={uploading} />
        <PromptInputTextarea
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder="Message…"
          disabled={isBusy}
        />
        <PromptInputToolbar>
          <div className="flex items-center gap-1">
            <PromptInputAttachButton onClick={openFilePicker} disabled={isBusy || uploading} />
            <button
              type="button"
              onClick={onToggleWebSearch}
              title={webSearchEnabled ? "Web search: ON" : "Web search: OFF"}
              aria-pressed={webSearchEnabled}
              className={`rounded-md p-1.5 transition-colors ${webSearchEnabled ? "text-primary" : "text-muted-foreground hover:bg-surface-2"}`}
            >
              <Globe className="size-4" />
            </button>
            <ModelSelector model={model} onModelChange={onModelChange} />
          </div>
          <PromptInputSubmit
            status={status}
            disabled={uploading || nothingToSend}
            onStop={onStop}
          />
        </PromptInputToolbar>
      </PromptInput>
    </div>
  );
}

function ErrorBanner({
  message,
  children,
}: {
  message: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mt-2 flex items-center gap-2 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
      <CircleAlert className="size-3.5 shrink-0" />
      <span className="flex-1">{message}</span>
      {children}
    </div>
  );
}
