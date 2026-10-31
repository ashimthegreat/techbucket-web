import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/inter-tight";
import "./globals.css";
import { siteUrl } from "@/lib/utils";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "Tech Bucket | IT Consulting, Cybersecurity & Managed Services in Nepal",
    template: "%s | Tech Bucket",
  },
  applicationName: "Tech Bucket",
  icons: { icon: "/favicon.ico", apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#111417",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
