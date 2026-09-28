"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Cookie, X, ShieldCheck, Settings } from "lucide-react";

export type CookieConsentType = "all" | "essential";

export default function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has already made an explicit consent choice
    const consent = localStorage.getItem("100pg_cookie_consent");
    if (!consent) {
      // Delay slightly for smooth entrance without layout shifts
      const timer = setTimeout(() => setIsVisible(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleConsent = (type: CookieConsentType) => {
    localStorage.setItem("100pg_cookie_consent", type);
    localStorage.setItem("100pg_privacy_ack", "true");
    
    // Dispatch custom event so ad components can adapt to user consent choice
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("100pg_consent_update", { detail: { consent: type } }));
    }
    
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-lg z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="p-5 rounded-2xl bg-zinc-950/95 backdrop-blur-xl border border-zinc-800 shadow-[0_10px_40px_rgba(0,0,0,0.85)] text-zinc-300 relative group">
        <button
          onClick={() => handleConsent("essential")}
          className="absolute top-3 right-3 p-1 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-900 transition-colors"
          aria-label="Dismiss cookie notice"
        >
          <X size={16} />
        </button>

        <div className="flex items-start gap-3.5 pr-4">
          <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400 shrink-0 mt-0.5">
            <Cookie size={22} />
          </div>
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-sm font-bold font-outfit text-white">
                Privacy &amp; Cookie Preferences
              </h4>
              <span className="text-[10px] text-zinc-400 border border-zinc-800 bg-zinc-900 px-1.5 py-0.5 rounded font-mono">
                GDPR &bull; CCPA &bull; OAIC
              </span>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              We use <strong>essential cookies</strong> to save your Steam login and local checklist progress. With your consent, we and our partners (Google AdSense) also use non-essential cookies to deliver contextual, non-intrusive advertisements.
            </p>

            {/* Granular GDPR / ePrivacy Choice Controls */}
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <button
                onClick={() => handleConsent("all")}
                className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-black font-extrabold text-xs shadow-md shadow-orange-500/20 transition-all active:scale-95"
              >
                Accept All
              </button>
              <button
                onClick={() => handleConsent("essential")}
                className="px-3.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white text-xs font-semibold transition-all active:scale-95"
              >
                Essential Only
              </button>
              <Link
                href="/privacy"
                className="text-xs text-zinc-400 hover:text-orange-400 underline transition-colors ml-1"
              >
                Privacy Policy
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
