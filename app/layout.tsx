import type { Metadata } from "next";
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
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#faf9f5" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#262624" media="(prefers-color-scheme: dark)" />
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("theme"),c=t==="dark"||(!t&&matchMedia("(prefers-color-scheme:dark)").matches),m=document.querySelector('meta[name="theme-color"]');if(c){document.documentElement.classList.add("dark");if(m)m.content="#262624"}else{if(m)m.content="#faf9f5"}}catch(e){}`,
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased font-sans">{children}</body>
    </html>
  );
}
