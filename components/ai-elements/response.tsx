import { Streamdown } from "streamdown";
import { code } from "@streamdown/code";

import { cn } from "@/lib/utils";

export function Response({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <div className={cn("max-w-none [&_pre]:border [&_pre]:border-border", className)}>
      <Streamdown plugins={{ code }}>{children}</Streamdown>
    </div>
  );
}
