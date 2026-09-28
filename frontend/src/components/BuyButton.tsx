import React from "react";
import { ShoppingCart, ExternalLink } from "lucide-react";

interface BuyButtonProps {
  gameName: string;
  buyUrl: string;
  className?: string;
}

export default function BuyButton({ gameName, buyUrl, className = "" }: BuyButtonProps) {
  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 p-5 bg-black border border-orange-500/30 rounded-2xl shadow-[0_0_30px_rgba(249,115,22,0.1)] hover:border-orange-500/50 transition-all ${className}`}>
      <div className="flex items-center gap-3.5 text-center sm:text-left">
        <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center shrink-0">
          <ShoppingCart size={22} className="text-orange-400" />
        </div>
        <div>
          <h3 className="text-lg font-bold font-outfit text-white">
            Ready to 100% {gameName}?
          </h3>
        </div>
      </div>
      <a
        href={buyUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-black font-extrabold text-base rounded-xl shadow-[0_0_20px_rgba(249,115,22,0.35)] hover:shadow-[0_0_30px_rgba(249,115,22,0.55)] transition-all hover:scale-[1.02] active:scale-[0.98] shrink-0"
        aria-label={`Buy ${gameName}`}
      >
        <span>Buy Game Now</span>
        <ExternalLink size={18} className="stroke-[2.5]" />
      </a>
    </div>
  );
}
