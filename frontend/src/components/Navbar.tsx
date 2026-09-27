import Link from "next/link";
import { Gamepad2 } from "lucide-react";

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/60 backdrop-blur-xl supports-[backdrop-filter]:bg-black/40">
      <div className="container mx-auto px-4 flex h-16 items-center">
        <Link href="/" className="flex items-center gap-3 transition-transform hover:scale-105">
          <Gamepad2 size={28} className="text-orange-500 drop-shadow-[0_0_10px_rgba(249,115,22,0.6)]" />
          <span className="font-outfit text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-orange-500 via-amber-400 to-yellow-400">
            100PercentGuides
          </span>
        </Link>
      </div>
    </nav>
  );
}
