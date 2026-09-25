import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

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
    <html lang="en">
      <body>
        <Navbar />
        <main className="container" style={{ paddingBottom: "100px" }}>
          {children}
        </main>
      </body>
    </html>
  );
}
