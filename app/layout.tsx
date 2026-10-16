import type { Metadata, Viewport } from "next";
import "@fontsource-variable/nunito";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Study Pal",
  description:
    "Tests what you know, teaches only what you're missing, and shows your before-and-after score.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f1eee7" },
    { media: "(prefers-color-scheme: dark)", color: "#1b1f1d" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-bg text-ink">
        <Navbar />
        <main className="flex-1 w-full max-w-xl mx-auto px-4 pb-16">{children}</main>
      </body>
    </html>
  );
}
