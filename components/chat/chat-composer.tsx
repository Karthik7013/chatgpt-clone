"use client";

import type * as React from "react";
import type { ChatStatus } from "ai";
import { Globe } from "lucide-react";

import {
  PromptInput,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputAttachButton,
  PromptInputAttachmentsDisplay,
} from "@/components/ai-elements/prompt-input";
import { ModelSelector } from "@/components/model-selector";
import { ErrorBanner } from "@/components/chat/error-banner";
import type { PendingFile } from "@/components/chat/use-attachment-upload";

export type ComposerUpload = {
  files: PendingFile[];
  onRemoveFile: (id: string) => void;
  uploading: boolean;
  onFilesChosen: (event: React.ChangeEvent<HTMLInputElement>) => void;
  openFilePicker: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  error: string | null;
};

export type ComposerModel = {
  id: string;
  onChange: (model: string) => void;
  webSearchEnabled: boolean;
  onToggleWebSearch: () => void;
};

export type ComposerSave = {
  error: string | null;
  onDismiss: () => void;
};

/** The message box, its toolbar, and the banners that sit just above it. */
export function ChatComposer({
  input,
  onInputChange,
  onSubmit,
  onStop,
  status,
  isBusy,
  upload: {
    files,
    onRemoveFile,
    uploading,
    onFilesChosen,
    openFilePicker,
    fileInputRef,
    error: uploadError,
  },
  model: {
    id: modelId,
    onChange: onModelChange,
    webSearchEnabled,
    onToggleWebSearch,
  },
  save: { error: saveError, onDismiss: onDismissSaveError },
}: {
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onStop: () => void;
  status: ChatStatus;
  isBusy: boolean;
  upload: ComposerUpload;
  model: ComposerModel;
  save: ComposerSave;
}) {
  const nothingToSend = input.trim() === "" && files.length === 0;

  return (
    <div className="mx-auto w-full max-w-3xl bg-background px-2 md:px-0">
      {saveError ? (
        <ErrorBanner message={saveError} className="mt-2">
          <button type="button" onClick={onDismissSaveError} className="rounded hover:underline">
            Dismiss
          </button>
        </ErrorBanner>
      ) : null}
      {uploadError ? <ErrorBanner message={uploadError} className="mt-2" /> : null}

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
            <ModelSelector model={modelId} onModelChange={onModelChange} />
          </div>
          <PromptInputSubmit
            status={status}
            disabled={uploading || nothingToSend}
            onStop={onStop}
          />
        </PromptInputToolbar>
      </PromptInput>
      <div className="h-3"></div>
    </div>
  );
}
