import { cn } from "@/lib/utils";

export function Loader({ className, size = 16 }: { className?: string; size?: number }) {
  return (
    <svg
      className={cn("animate-spin text-muted-foreground", className)}
      style={{ width: size, height: size }}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Loading"
    >
      <circle
        className="opacity-20"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        d="M22 12a10 10 0 0 0-10-10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ThinkingDots({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <span className="thinking-dot size-1.5 rounded-full bg-muted-foreground [animation-delay:0ms]" />
      <span className="thinking-dot size-1.5 rounded-full bg-muted-foreground [animation-delay:150ms]" />
      <span className="thinking-dot size-1.5 rounded-full bg-muted-foreground [animation-delay:300ms]" />
    </span>
  );
}
