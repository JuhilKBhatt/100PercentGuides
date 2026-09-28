import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CookieBanner from "@/components/CookieBanner";
import Providers from "@/components/Providers";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "100PercentGuides | Ultimate Game Achievement Roadmaps",
  description: "Track your achievements and pursue 100% completion with interactive roadmaps, step-by-step checklists, and real-time Steam sync.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn("dark bg-black font-sans", geist.variable)}>
      <body className="min-h-screen bg-black text-foreground antialiased selection:bg-orange-500 selection:text-black flex flex-col justify-between">
        <Providers>
          <Navbar />
          <main className="w-full flex-1 bg-black">
            {children}
          </main>
          <Footer />
          <CookieBanner />
        </Providers>
      </body>
    </html>
  );
}
