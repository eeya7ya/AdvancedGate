import type { Metadata } from "next";
import localFont from "next/font/local";
import { Suspense } from "react";
import { SessionProvider } from "@/components/auth/session-provider";
import { ThemeProvider } from "@/lib/theme";
import { auth } from "~/auth";
import "./globals.css";

const geistSans = localFont({
  src: "../../node_modules/geist/dist/fonts/geist-sans/Geist-Variable.woff2",
  variable: "--font-geist",
  display: "swap",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "eSpark AI",
  description:
    "Your intelligent AI workspace — automation, insights, and assistance in one powerful platform.",
  keywords: [
    "AI workspace",
    "artificial intelligence",
    "automation",
    "eSpark AI",
    "intelligent assistant",
  ],
  authors: [{ name: "eSpark" }],
  openGraph: {
    title: "eSpark AI",
    description: "Think smarter, work faster with eSpark AI",
    type: "website",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`} data-theme="dark" suppressHydrationWarning>
      <body className="min-h-full flex flex-col" style={{ background: "var(--bg-base)" }}>
        <ThemeProvider>
          <Suspense>
            <SessionProvider session={session}>{children}</SessionProvider>
          </Suspense>
        </ThemeProvider>
      </body>
    </html>
  );
}
