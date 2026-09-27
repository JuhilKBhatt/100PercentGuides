import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "100PercentGuides | Ultimate Game Completion",
  description: "Track your achievements and get 100% completion in every game with our dynamic guides.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn("dark bg-black font-sans", geist.variable)}>
      <body className="min-h-screen bg-black text-foreground antialiased selection:bg-orange-500 selection:text-black">
        <Navbar />
        <main className="w-full min-h-screen bg-black">
          {children}
        </main>
      </body>
    </html>
  );
}
