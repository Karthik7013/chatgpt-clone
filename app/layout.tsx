import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chat — AI SDK Demo",
  description:
    "A Gemini-powered interface built with Next.js, shadcn/ui, AI Elements, and the Vercel AI SDK.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased font-sans">
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: "var(--popover)",
              color: "var(--popover-foreground)",
              border: "1px solid var(--border)",
            },
          }}
        />
      </body>
    </html>
  );
}
