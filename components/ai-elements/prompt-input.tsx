"use client";

import * as React from "react";
import { ArrowUpIcon, PlusIcon, SquareIcon } from "lucide-react";
import type { FileUIPart } from "ai";
import { nanoid } from "nanoid";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ai-elements/loader";
import {
  Attachments,
  Attachment,
  AttachmentPreview,
  AttachmentInfo,
  AttachmentRemove,
  type AttachmentData,
} from "@/components/ai-elements/attachments";

export function PromptInput({
  onSubmit,
  className,
  children,
}: {
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <form
      onSubmit={onSubmit}
      className={cn(
        "flex flex-col gap-2 rounded-3xl border border-border bg-surface p-2.5 px-1.5 shadow-lg",
        className,
      )}
    >
      {children}
    </form>
  );
}

export const PromptInputTextarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, onKeyDown, ...props }, ref) => {
  const innerRef = React.useRef<HTMLTextAreaElement | null>(null);

  const resize = React.useCallback(() => {
    const el = innerRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, []);

  React.useEffect(() => {
    resize();
  }, [props.value, resize]);

  return (
    <textarea
      ref={(node) => {
        innerRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = node;
      }}
      rows={1}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          e.currentTarget.form?.requestSubmit();
        }
        onKeyDown?.(e);
      }}
      className={cn(
        "max-h-[200px] min-h-[24px] w-full resize-none bg-transparent px-2 py-1.5 text-[15px] font-medium leading-6 text-foreground placeholder:text-muted-foreground focus:outline-none",
        className,
      )}
      {...props}
    />
  );
});
PromptInputTextarea.displayName = "PromptInputTextarea";

export function PromptInputToolbar({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-2 px-1", className)}>
      {children}
    </div>
  );
}

export function PromptInputSubmit({
  status,
  disabled,
  onStop,
  className,
}: {
  status: "submitted" | "streaming" | "ready" | "error";
  disabled?: boolean;
  onStop?: () => void;
  className?: string;
}) {
  if (status === "submitted" || status === "streaming") {
    return (
      <Button
        type="button"
        size="icon"
        onClick={onStop}
        className={cn("rounded-full", className)}
        aria-label="Stop generating"
      >
        {status === "submitted" ? <Loader size={14} className="text-primary-foreground" /> : (
          <SquareIcon className="size-3.5 fill-current" />
        )}
      </Button>
    );
  }

  return (
    <Button
      type="submit"
      size="icon"
      disabled={disabled}
      className={cn("rounded-full", className)}
      aria-label="Send message"
    >
      <ArrowUpIcon className="size-4" />
    </Button>
  );
}

// ============================================================================
// File Upload
// ============================================================================

export interface UsePromptInputAttachmentsOptions {
  maxFiles?: number;
  maxFileSize?: number;
  accept?: string;
  onFilesChange?: (files: (FileUIPart & { id: string })[]) => void;
}

export function usePromptInputAttachments(options: UsePromptInputAttachmentsOptions = {}) {
  const { maxFiles = 10, maxFileSize = 50 * 1024 * 1024, accept, onFilesChange } = options;
  const [files, setFiles] = React.useState<(FileUIPart & { id: string })[]>([]);
  const [uploading, setUploading] = React.useState<boolean>(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const add = React.useCallback(
    (newFiles: (FileUIPart & { id: string })[]) => {
      setFiles((prev) => {
        const next = [...prev, ...newFiles].slice(0, maxFiles);
        onFilesChange?.(next);
        return next;
      });
    },
    [maxFiles, onFilesChange]
  );

  const remove = React.useCallback(
    (id: string) => {
      setFiles((prev) => {
        const next = prev.filter((f) => f.id !== id);
        onFilesChange?.(next);
        return next;
      });
    },
    [onFilesChange]
  );

  const clear = React.useCallback(() => {
    setFiles([]);
    onFilesChange?.([]);
  }, [onFilesChange]);

  const openFileDialog = React.useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return {
    files,
    uploading,
    setUploading,
    add,
    remove,
    clear,
    openFileDialog,
    fileInputRef,
    maxFiles,
    maxFileSize,
    accept,
  };
}

export interface PromptInputAttachButtonProps {
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

export function PromptInputAttachButton({
  onClick,
  disabled,
  className,
}: PromptInputAttachButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={onClick}
      disabled={disabled}
      className={cn("size-8 rounded-full", className)}
      aria-label="Attach files"
    >
      <PlusIcon className="size-4" />
    </Button>
  );
}

export interface PromptInputAttachmentsDisplayProps {
  files: (FileUIPart & { id: string })[];
  onRemove?: (id: string) => void;
  uploading?: boolean;
  className?: string;
}

export function PromptInputAttachmentsDisplay({
  files,
  onRemove,
  uploading,
  className,
}: PromptInputAttachmentsDisplayProps) {
  if (files.length === 0 && !uploading) return null;

  return (
    <Attachments variant="grid" className={cn("justify-start", className)}>
      {files.map((file) => (
        <div key={file.id} className="flex flex-col items-center">
          <Attachment
            data={file}
            onRemove={onRemove ? () => onRemove(file.id) : undefined}
            onClick={() => file.url && window.open(file.url, "_blank")}
            className="cursor-pointer"
          >
            <AttachmentPreview />
            <AttachmentRemove />
          </Attachment>
          <span className="w-full truncate pt-1 text-center text-xs text-muted-foreground">
            {file.filename || "File"}
          </span>
        </div>
      ))}
      {uploading && (
        <div className="flex flex-col items-start">
          <div className="flex size-24 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
            <Loader size={24} className="text-muted-foreground" />
          </div>
          <span className="w-24 truncate pt-1 text-center text-xs text-muted-foreground">
            Uploading…
          </span>
        </div>
      )}
    </Attachments>
  );
}
