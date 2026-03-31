import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Élan B2",
  description: "Personal DELF B2 coach with original practice, non-repeating variants, and coach feedback.",
  manifest: "/manifest.webmanifest",
  applicationName: "Élan B2",
  appleWebApp: {
    capable: true,
    title: "Élan B2",
    statusBarStyle: "default"
  }
};

export const viewport: Viewport = {
  themeColor: "#f5eadb",
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
