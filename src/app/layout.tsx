import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

// Inter is self-hosted through @fontsource-variable/inter (no request to Google Fonts,
// so it also works offline and under the strict CSP in next.config.ts).

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
