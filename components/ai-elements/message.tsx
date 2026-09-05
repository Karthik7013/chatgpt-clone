import * as React from "react";

import { cn } from "@/lib/utils";

export type MessageRole = "user" | "assistant" | "system";

export function Message({
  role,
  className,
  children,
}: {
  role: MessageRole;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      data-role={role}
      className={cn(
        "group flex w-full flex-col gap-2",
        role === "user" ? "items-end" : "items-start",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function MessageContent({
  role,
  className,
  children,
}: {
  role: MessageRole;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "text-[15px] leading-7",
        role === "user"
          ? "max-w-[85%] rounded-2xl bg-surface-2 px-4 py-2.5 font-medium text-foreground"
          : "w-full text-foreground",
        className,
      )}
    >
      {children}
    </div>
  );
}
