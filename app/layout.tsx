import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import Navbar from "../components/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Biso-Commerce",
  description: "Gestion moderne des commerces",
};

// 🔥 AJOUT SEULEMENT ICI (ANTI-ZOOM)
export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={`${geistSans.variable} ${geistMono.variable}`}>
      
      <head>
        <link rel="manifest" href="/manifest.json" />
      </head>

      <body className="bg-slate-950 min-h-screen">
        <Navbar />
        {children}
      </body>

    </html>
  );
}
