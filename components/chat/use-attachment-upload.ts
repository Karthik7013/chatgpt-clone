"use client";

import * as React from "react";
import type { FileUIPart } from "ai";

import { uploadFileToWorker } from "@/lib/file-upload";

/** An uploaded file, ready to be sent as a message attachment. */
export type PendingFile = FileUIPart & { id: string; tmpUrl: string };

const UPLOAD_ERROR_TIMEOUT_MS = 5000;

/**
 * Uploads picked files to the worker before they can be sent, and tracks the
 * files waiting to be attached to the next message.
 *
 * Chat itself needs a URL for an attachment, so the bytes have to leave the
 * browser first. `tmpUrl` is kept alongside `url` because the route reads
 * small text files from it to inline their contents for the model.
 */
export function useAttachmentUpload() {
  const [files, setFiles] = React.useState<PendingFile[]>([]);
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  async function uploadSelected(selected: FileList | null) {
    if (!selected || selected.length === 0) return;

    setUploading(true);
    try {
      const uploaded = await Promise.all(
        Array.from(selected).map(async (file): Promise<PendingFile> => {
          const result = await uploadFileToWorker(file);
          return {
            type: "file" as const,
            id: result.itemId,
            filename: result.fileName,
            mediaType: file.type || "application/octet-stream",
            url: result.instantDownloadUrl,
            tmpUrl: result.instantTmpUrl || result.instantDownloadUrl,
          };
        }),
      );
      setFiles((prev) => [...prev, ...uploaded]);
    } catch (err) {
      console.error("Upload failed:", err);
      setError(err instanceof Error ? err.message : "File upload failed");
      window.setTimeout(() => setError(null), UPLOAD_ERROR_TIMEOUT_MS);
    } finally {
      setUploading(false);
      // Reset the input so picking the same file twice in a row still fires
      // a change event.
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function remove(id: string) {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }

  function clear() {
    setFiles([]);
  }

  function openFilePicker() {
    inputRef.current?.click();
  }

  return {
    files,
    uploading,
    error,
    inputRef,
    uploadSelected,
    remove,
    clear,
    openFilePicker,
  };
}
