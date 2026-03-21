import type { Metadata } from "next";
import localFont from "next/font/local";
import { Suspense } from "react";
import { SessionProvider } from "@/components/auth/session-provider";
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
  ],
  authors: [{ name: "eSpark" }],
  openGraph: {
    title: "eSpark-Learning KIT",
    description: "Level up your engineering career",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#080c14]">
        <Suspense>
          <SessionProvider>{children}</SessionProvider>
        </Suspense>
      </body>
    </html>
  );
}
