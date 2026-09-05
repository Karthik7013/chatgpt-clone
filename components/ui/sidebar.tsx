"use client";

import * as React from "react";
import { MenuIcon } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SIDEBAR_COOKIE_NAME = "sidebar_state";
const SIDEBAR_KEYBOARD_SHORTCUT = "b";

type SidebarContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  isMobile: boolean;
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
  toggleSidebar: () => void;
};

const SidebarContext = React.createContext<SidebarContextValue | null>(null);

export function useSidebar() {
  const ctx = React.useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar must be used within SidebarProvider");
  return ctx;
}

export function SidebarProvider({
  defaultOpen = true,
  children,
  className,
  style,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { defaultOpen?: boolean }) {
  const [open, setOpenState] = React.useState(defaultOpen);
  const [openMobile, setOpenMobile] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  function setOpen(value: boolean) {
    setOpenState(value);
    document.cookie = `${SIDEBAR_COOKIE_NAME}=${value}; path=/; max-age=${60 * 60 * 24 * 365}`;
  }

  function toggleSidebar() {
    if (isMobile) setOpenMobile((v) => !v);
    else setOpen(!open);
  }

  React.useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === SIDEBAR_KEYBOARD_SHORTCUT && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        toggleSidebar();
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile, open]);

  return (
    <SidebarContext.Provider
      value={{ open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar }}
    >
      <div
        data-sidebar="provider"
        style={
          {
            "--sidebar-width": "17rem",
            "--sidebar-width-icon": "3.5rem",
            ...style,
          } as React.CSSProperties
        }
        className={cn("group/sidebar-wrapper flex min-h-svh w-full", className)}
        {...props}
      >
        {children}
      </div>
    </SidebarContext.Provider>
  );
}

export function Sidebar({
  side = "left",
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLElement> & { side?: "left" | "right" }) {
  const { open, isMobile, openMobile, setOpenMobile } = useSidebar();

  if (isMobile) {
    return (
      <Sheet open={openMobile} onOpenChange={setOpenMobile}>
        <SheetContent
          side={side}
          className="flex flex-col p-0 [&>button]:hidden"
        >
          {children}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside
      data-state={open ? "expanded" : "collapsed"}
      className={cn(
        "relative flex h-svh flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-in-out",
        open
          ? "w-[var(--sidebar-width)]"
          : "w-[var(--sidebar-width-icon)] overflow-hidden",
        className
      )}
      {...props}
    >
      {children}
    </aside>
  );
}

export function SidebarTrigger({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { toggleSidebar } = useSidebar();
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleSidebar}
      className={cn("size-8 shrink-0", className)}
      aria-label="Toggle sidebar"
      {...props}
    >
      <MenuIcon className="size-4" />
    </Button>
  );
}

export function SidebarInset({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  return (
    <main
      className={cn(
        "relative flex min-h-svh flex-1 flex-col overflow-hidden bg-background",
        className
      )}
      {...props}
    />
  );
}

export function SidebarHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-2 p-3", className)} {...props} />;
}

export function SidebarContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden px-2 py-1", className)}
      {...props}
    />
  );
}

export function SidebarFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mt-auto border-t border-sidebar-border p-3", className)} {...props} />;
}

export function SidebarMenu({ className, ...props }: React.HTMLAttributes<HTMLUListElement>) {
  return <ul className={cn("flex flex-col gap-0.5", className)} {...props} />;
}

export function SidebarMenuItem({ className, ...props }: React.HTMLAttributes<HTMLLIElement>) {
  return <li className={cn("group/item relative", className)} {...props} />;
}

export const SidebarMenuButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    isActive?: boolean;
    asChild?: boolean;
  }
>(({ className, isActive, children, ...props }, ref) => (
  <button
    ref={ref}
    data-active={isActive}
    className={cn(
      "flex w-full items-center gap-2 overflow-hidden rounded-lg px-2.5 py-2 text-left text-sm text-sidebar-foreground outline-none transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring",
      isActive && "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
      className
    )}
    {...props}
  >
    {children}
  </button>
));
SidebarMenuButton.displayName = "SidebarMenuButton";

export const SidebarMenuAction = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { showOnHover?: boolean }
>(({ className, showOnHover, ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      "absolute right-1 top-1/2 -translate-y-1/2 rounded-md p-1 text-sidebar-foreground/50 outline-none transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring",
      showOnHover &&
        "opacity-0 group-hover/item:opacity-100 data-[state=open]:opacity-100",
      className
    )}
    {...props}
  />
));
SidebarMenuAction.displayName = "SidebarMenuAction";
