import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import IosInstallPrompt from "@/components/IosInstallPrompt";

import Navbar from "../components/Navbar";
import ServiceWorkerRegistration from "../components/ServiceWorkerRegistration";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BISO-COMMERCE | Gestion intelligente de commerce",

  description:
    "BISO-COMMERCE est une application moderne qui aide les commerçants à gérer leurs ventes, produits, stocks, dépenses, dettes et bénéfices facilement depuis leur téléphone.",

  keywords: [
    "BISO-COMMERCE",
    "gestion commerce",
    "caisse digitale",
    "gestion stock",
    "vente",
    "boutique",
    "commerce RDC",
    "application commerce Afrique",
  ],

  authors: [
    {
      name: "DIEUMERCI IDI",
    },
  ],

  creator: "BISO-COMMERCE",

  verification: {
    google:
      "In1-w-1oDbl4hNV16D73e30t4Va-NgscHlBY9hvnYU0",
  },

  openGraph: {
    title: "BISO-COMMERCE | Gestion intelligente de commerce",

    description:
      "Gérez votre commerce, vos ventes, vos stocks, vos dépenses et vos dettes avec BISO-COMMERCE.",

    url: "https://biso-commerce-mqbj.vercel.app",

    siteName: "BISO-COMMERCE",

    locale: "fr_FR",

    type: "website",
  },

  twitter: {
    card: "summary_large_image",

    title: "BISO-COMMERCE | Gestion intelligente de commerce",

    description:
      "La solution digitale pour gérer facilement votre commerce depuis votre téléphone.",
  },

  manifest: "/manifest.json",
};

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
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <head>
        <link rel="manifest" href="/manifest.json" />
      </head>

      <body className="bg-slate-950 min-h-screen">
        <ServiceWorkerRegistration />

        <Navbar />

        {children}

        <IosInstallPrompt />

        <Toaster position="top-center" />
      </body>
    </html>
  );
}