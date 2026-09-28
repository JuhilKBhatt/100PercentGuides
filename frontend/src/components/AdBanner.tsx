"use client";

import React, { useEffect, useRef, useState } from "react";

interface AdBannerProps {
  position?: "top" | "bottom" | "inline";
  adSlot?: string;
  adClient?: string;
  isActive?: boolean;
  slideIndex?: number;
  className?: string;
}

/**
 * Google AdSense Compliant Banner Slot
 * Implements MRC & Google AdSense "Begin-to-Render" standard:
 * An ad impression is only triggered when:
 * 1. The ad container is physically visible in the viewport (IntersectionObserver).
 * 2. If in a carousel, the ad is the currently active slide triggered by user action.
 */
export default function AdBanner({
  position = "inline",
  adSlot,
  adClient,
  isActive = true,
  slideIndex,
  className = "",
}: AdBannerProps) {
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
            // Keep in-viewport status or allow strict render
            setIsInViewport(entry.isIntersecting);
          }
        });
      },
      { threshold: 0.5 } // Minimum 50% visible per MRC standards
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // 2. Trigger Begin-to-Render ONLY when both in-viewport and active on user action
  useEffect(() => {
    if (isActive && isInViewport && !hasBegunRender) {
      setHasBegunRender(true);

      // If official AdSense script is present, safely push ad tag
      if (effectiveClient && adSlot && !pushedRef.current) {
        try {
          pushedRef.current = true;
          ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
        } catch (e) {
          console.warn("[AdSense] Push notice:", e);
        }
      }
    }
  }, [isActive, isInViewport, hasBegunRender, effectiveClient, adSlot]);

  const positionClasses = {
    top: "w-full flex justify-center py-4 bg-black border-b border-orange-500/20",
    bottom: "w-full flex justify-center py-4 bg-black border-t border-orange-500/20",
    inline: "w-full flex justify-center my-4",
  };

  return (
    <div className={`${positionClasses[position]} ${className}`} ref={containerRef}>
      {/* Reserved dimension container prevents Cumulative Layout Shift (CLS) */}
      <div className="relative flex flex-col items-center justify-center w-full max-w-[728px] min-h-[90px] h-[90px] bg-black border border-zinc-900 rounded-xl overflow-hidden group shadow-lg transition-all">
        {/* AdSense Policy Disclosure Badge */}
        <div className="absolute top-1 left-2.5 flex items-center gap-1.5">
          <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">
            Advertisement
          </span>
          {slideIndex !== undefined && (
            <span className="text-[9px] font-mono text-zinc-600 bg-zinc-950 px-1 rounded border border-zinc-900">
              Slot #{slideIndex + 1}
            </span>
          )}
        </div>

        {/* Live AdSense Slot vs Compliant Visual Placeholder */}
        {effectiveClient && adSlot ? (
          <div className="w-full h-full flex items-center justify-center">
            {hasBegunRender ? (
              <ins
                className="adsbygoogle"
                style={{ display: "inline-block", width: "728px", height: "90px" }}
                data-ad-client={effectiveClient}
                data-ad-slot={adSlot}
                data-ad-format="horizontal"
                data-full-width-responsive="false"
              />
            ) : (
              <div className="text-zinc-600 text-xs font-mono animate-pulse">
                Ad queued for render on view...
              </div>
            )}
          </div>
        ) : (
          /* Compliant Placeholder that renders on view */
          <div className="flex flex-col items-center opacity-85 group-hover:opacity-100 transition-opacity">
            <p className="font-bold font-outfit text-white tracking-wide text-sm sm:text-base">
              Premium Ad Space
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-orange-400 font-medium">728 x 90</span>
              <span className="text-zinc-600 text-[10px] font-mono">&bull;</span>
              <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                Begin-to-Render Compliant
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
