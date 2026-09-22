import type { Metadata } from "next";

import { AppProviders } from "@/components/providers/app-providers";
import { siteConfig } from "@/config/site.config";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: "DSS Universe",
  description: "Build. Share. Learn. Grow. Together.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
