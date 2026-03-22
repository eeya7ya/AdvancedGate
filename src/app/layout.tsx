import type { Metadata } from "next";
import localFont from "next/font/local";
import { Suspense } from "react";
import { SessionProvider } from "@/components/auth/session-provider";
import { ThemeProvider } from "@/lib/theme";
import "./globals.css";

const geistSans = localFont({
  src: "../../node_modules/geist/dist/fonts/geist-sans/Geist-Variable.woff2",
  variable: "--font-geist",
  display: "swap",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "eSpark-Learning KIT",
  description:
    "The professional learning platform for Electrical Power Engineering, Networking, and Software Development.",
  keywords: [
    "electrical engineering",
    "power systems",
    "networking",
    "coding",
    "e-learning",
    "AI learning advisor",
  ],
  authors: [{ name: "eSpark" }],
  openGraph: {
    title: "eSpark-Learning KIT",
    description: "AI-powered engineering career advisor",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`} data-theme="dark" suppressHydrationWarning>
      <body className="min-h-full flex flex-col" style={{ background: "var(--bg-base)" }}>
        <ThemeProvider>
          <Suspense>
            <SessionProvider>{children}</SessionProvider>
          </Suspense>
        </ThemeProvider>
      </body>
    </html>
  );
}
