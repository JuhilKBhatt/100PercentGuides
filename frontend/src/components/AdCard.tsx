"use client";

import React, { useEffect, useRef, useState } from "react";

interface AdCardProps {
  adSlot?: string;
  adClient?: string;
  slotIndex?: number;
  title?: string;
  className?: string;
}

/**
 * Google AdSense Compliant Card Ad Space (Medium Rectangle / 300x250 responsive)
 * Implements MRC & Google AdSense "Begin-to-Render" standard (enforced globally 2027):
 * 1. IntersectionObserver (50% in-view threshold) triggers render only when visible.
 * 2. Reserved dimensions (min-h-[250px] h-[250px]) prevent Cumulative Layout Shift (CLS).
 * 3. Clear policy disclosures ("Advertisement", slot indicator).
 */
export default function AdCard({
  adSlot,
  adClient,
  slotIndex,
  title = "Premium Ad Space",
  className = "",
}: AdCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInViewport, setIsInViewport] = useState(false);
  const [hasBegunRender, setHasBegunRender] = useState(false);
  const pushedRef = useRef(false);

  const effectiveClient = adClient || process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;

  // 1. Observe viewport entry (Begin-to-Render visibility check)
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInViewport(true);
          } else {
            setIsInViewport(entry.isIntersecting);
          }
        });
      },
      { threshold: 0.5 } // Minimum 50% visible per MRC standards
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // 2. Trigger Begin-to-Render ONLY when in viewport
  useEffect(() => {
    if (isInViewport && !hasBegunRender) {
      setHasBegunRender(true);

      if (effectiveClient && adSlot && !pushedRef.current) {
        try {
          pushedRef.current = true;
          ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
        } catch (e) {
          console.warn("[AdSense Card] Push notice:", e);
        }
      }
    }
  }, [isInViewport, hasBegunRender, effectiveClient, adSlot]);

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col items-center justify-center w-full min-h-[250px] h-[250px] bg-black/90 border border-zinc-900 hover:border-orange-500/40 rounded-2xl overflow-hidden group shadow-xl transition-all duration-300 hover:shadow-orange-500/5 hover:-translate-y-0.5 ${className}`}
    >
      {/* Background ambient gradient glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-amber-500/5 opacity-50 group-hover:opacity-100 transition-opacity pointer-events-none" />

      {/* Top Header: AdSense Policy Disclosure Badge */}
      <div className="absolute top-3 left-4 flex items-center gap-2 z-10">
        <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">
          Advertisement
        </span>
        {slotIndex !== undefined && (
          <span className="text-[9px] font-mono text-zinc-500 bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800">
            Card #{slotIndex}
          </span>
        )}
      </div>

      {/* Live AdSense Slot vs Compliant Visual Placeholder */}
      {effectiveClient && adSlot ? (
        <div className="w-full h-full flex items-center justify-center p-4 relative z-10">
          {hasBegunRender ? (
            <ins
              className="adsbygoogle"
              style={{ display: "block", width: "100%", height: "100%" }}
              data-ad-client={effectiveClient}
              data-ad-slot={adSlot}
              data-ad-format="rectangle"
              data-full-width-responsive="true"
            />
          ) : (
            <div className="text-zinc-600 text-xs font-mono animate-pulse">
              Ad queued for render on view...
            </div>
          )}
        </div>
      ) : (
        /* Compliant Card Placeholder */
        <div className="flex flex-col items-center text-center px-6 relative z-10">
          <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:border-orange-500/60 transition-all">
            <span className="text-orange-400 font-bold text-lg font-outfit">AD</span>
          </div>

          <h3 className="font-outfit font-bold text-white text-lg group-hover:text-amber-400 transition-colors">
            {title}
          </h3>

          <p className="text-xs text-zinc-400 mt-1 max-w-xs">
            High-visibility sponsored placement &bull; 300 &times; 250 / Responsive
          </p>

          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-zinc-900/80 w-full justify-center">
            <span className="text-[10px] text-zinc-500 font-mono">300 &times; 250</span>
            <span className="text-zinc-700 text-[10px]">&bull;</span>
            <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Begin-to-Render Compliant
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
