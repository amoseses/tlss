import type { Metadata } from "next";

import { SiteFooter } from "@/components/layout/site-footer";
import { LoginPrompt } from "@/components/personalization/login-prompt";
import { SiteHeader } from "@/components/layout/site-header";
import { Toaster } from "@/components/ui/sonner";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "GIVIT — AI Gift Intelligence",
    template: "%s · GIVIT",
  },
  description:
    "Tell us who it's for. We'll find the perfect gift in seconds. AI-powered gift discovery across thousands of products.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col font-sans">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
        <LoginPrompt />
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
