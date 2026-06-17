import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import type { ReactNode } from "react";
import { PwaRegister } from "@/components/pwa-register";
import { env } from "@/lib/env";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Expecto CRM",
  description: "Expecto CRM for lead tracking, follow-ups, and team performance",
  metadataBase: new URL(env.siteUrl),
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Expecto CRM",
  },
  icons: {
    icon: "/img/logo.png",
    apple: "/img/logo.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#020617",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Expecto CRM" />
        <link rel="apple-touch-icon" href="/img/logo.png" />
      </head>
      <body className="min-h-full bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.16),_transparent_32%),radial-gradient(circle_at_20%_20%,_rgba(249,115,22,0.08),_transparent_22%),linear-gradient(180deg,_#fafafa_0%,_#f1f5f9_100%)] text-slate-900">
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
