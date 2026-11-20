import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { THEME_COOKIE, parseTheme } from "@/lib/theme";
import "@/styles/tokens.css";
import "@/styles/base.css";

export const metadata: Metadata = {
  title: { default: "Whetstone", template: "%s · Whetstone" },
  description: "Owner interface for the Whetstone front-end knowledge base.",
  robots: { index: false, follow: false },
  referrer: "same-origin",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf9f6" },
    { media: "(prefers-color-scheme: dark)", color: "#15171a" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Reading cookies makes every page dynamic, which the per-request CSP nonce requires.
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);
  return (
    <html lang="en" data-theme={theme === "system" ? undefined : theme}>
      <body>{children}</body>
    </html>
  );
}
