import type { ReactNode } from "react";
import type { Metadata } from "next";
import { Manrope, Sora } from "next/font/google";

import { ToasterProvider } from "@/components/providers/toaster-provider";
import { APP_NAME } from "@/lib/constants";

import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
});

export const metadata: Metadata = {
  title: APP_NAME,
  description: "Production-ready kids check-in for Joy City Church on Supabase, Next.js, and Expo.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${manrope.variable} ${sora.variable} font-[var(--font-manrope)]`}>
        {children}
        <ToasterProvider />
      </body>
    </html>
  );
}
