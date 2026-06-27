import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://kirari.cafe"),
  title: "kirari.cafe ✦",
  description:
    "kirari.cafe — your biolink + chat, as a cute 2000s anime desktop. claim a handle, customize your page, sign guestbooks, chat 1:1 or in groups.",
  openGraph: {
    title: "kirari.cafe ✦",
    description: "your whole internet, one little window. claim a handle & make your corner of the web ♡",
    url: "https://kirari.cafe",
    siteName: "kirari.cafe",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "kirari.cafe ✦",
    description: "your whole internet, one little window ♡",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* All display/body/pixel faces used across the 4 skins. */}
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DotGothic16&family=Mochiy+Pop+P+One&family=Pixelify+Sans:wght@400..700&family=Varela+Round&family=Zen+Kaku+Gothic+New:wght@400;500;700&family=Zen+Maru+Gothic:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}
