import Script from "next/script";
import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CookieBanner from "@/components/CookieBanner";
import Providers from "@/components/Providers";
import JsonLd from "@/components/seo/JsonLd";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://100percentguides.com";
const adsenseClientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || "ca-pub-6476461912363006";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "100PercentGuides | Ultimate Game Achievement Roadmaps",
    template: "%s | 100PercentGuides",
  },
  description:
    "Track your achievements and pursue 100% completion with interactive roadmaps, step-by-step checklists, interactive maps, and real-time Steam sync.",
  keywords: [
    "game achievements",
    "100% completion guide",
    "trophy roadmaps",
    "steam achievement tracker",
    "interactive game maps",
    "platinum trophy guides",
  ],
  authors: [{ name: "100PercentGuides Editorial Team" }],
  creator: "100PercentGuides",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "100PercentGuides",
    title: "100PercentGuides | Ultimate Game Achievement Roadmaps",
    description:
      "Track your achievements and pursue 100% completion with interactive roadmaps, step-by-step checklists, and real-time Steam sync.",
  },
  twitter: {
    card: "summary_large_image",
    title: "100PercentGuides | Ultimate Game Achievement Roadmaps",
    description:
      "Track your achievements and pursue 100% completion with interactive roadmaps, step-by-step checklists, and real-time Steam sync.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "100PercentGuides",
    url: siteUrl,
    description: "Ultimate video game achievement roadmaps and 100% completion guides.",
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteUrl}/?search={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  const orgSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "100PercentGuides",
    url: siteUrl,
    logo: `${siteUrl}/favicon.ico`,
  };

  return (
    <html lang="en" className={cn("dark bg-black font-sans", geist.variable)}>
      <head>
        <meta name="google-adsense-account" content={adsenseClientId} />
        <JsonLd data={websiteSchema} />
        <JsonLd data={orgSchema} />
      </head>
      <body className="min-h-screen bg-black text-foreground antialiased selection:bg-orange-500 selection:text-black flex flex-col justify-between">
        <Providers>
          <Navbar />
          <main className="w-full flex-1 bg-black">
            {children}
          </main>
          <Footer />
          <CookieBanner />
          {/* Google AdSense Script */}
          <Script
            id="google-adsense"
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClientId}`}
            crossOrigin="anonymous"
            strategy="afterInteractive"
          />
        </Providers>
      </body>
    </html>
  );
}
