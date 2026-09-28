import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

// Inter is loaded via next/font/google in production. This sandbox has no
// outbound access to fonts.googleapis.com, so we fall back to the closest
// system stack here — swap back to `next/font/google` Inter when deploying.

export const metadata: Metadata = {
  title: "Zendmail — Create. Automate. Convert.",
  description:
    "AI-powered email marketing and customer growth platform for e-commerce businesses.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
