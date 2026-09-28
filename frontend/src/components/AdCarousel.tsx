"use client";

import React, { useState, useEffect, useCallback } from "react";
import AdBanner from "./AdBanner";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";

interface AdCarouselProps {
  slots?: { slotId?: string }[];
  className?: string;
}

/**
 * Google AdSense Compliant Carousel:
 * 1. Loops back infinitely (opts.loop = true).
 * 2. User-Action Only: Strictly zero autoplay/auto-refresh timers per Google AdSense policies.
 * 3. Begin-to-Render Standard: Off-screen slides are lazy and only begin rendering
 *    when brought into view by explicit user action.
 */
export default function AdCarousel({
  slots = [{}, {}, {}],
  className = "",
}: AdCarouselProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(slots.length);

  // Track active slide on user interaction
  useEffect(() => {
    if (!api) return;

    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap());

    const onSelect = () => {
      setCurrent(api.selectedScrollSnap());
    };

    api.on("select", onSelect);
    api.on("reInit", onSelect);

    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  const scrollTo = useCallback(
    (index: number) => {
      api?.scrollTo(index);
    },
    [api]
  );

  return (
    <div className={`w-full max-w-4xl mx-auto py-2 ${className}`}>
      <Carousel
        setApi={setApi}
        opts={{
          loop: true, // Loops back infinitely
          align: "center",
        }}
        className="w-full relative group"
      >
        <CarouselContent>
          {slots.map((slot, index) => {
            const isActive = current === index;

            return (
              <CarouselItem key={index}>
                <div className="p-1">
                  <AdBanner
                    position="inline"
                    adSlot={slot.slotId}
                    isActive={isActive}
                    slideIndex={index}
                  />
                </div>
              </CarouselItem>
            );
          })}
        </CarouselContent>

        {/* User Action Navigation Arrows */}
        <CarouselPrevious className="flex -left-4 sm:-left-6 border-orange-500/30 bg-black/90 text-orange-400 hover:bg-orange-500 hover:text-black hover:border-orange-500 transition-all shadow-lg" />
        <CarouselNext className="flex -right-4 sm:-right-6 border-orange-500/30 bg-black/90 text-orange-400 hover:bg-orange-500 hover:text-black hover:border-orange-500 transition-all shadow-lg" />
      </Carousel>

      {/* User Action Slide Indicators & Policy Compliance Info */}
      <div className="flex items-center justify-between px-2 pt-1">
        <div className="flex items-center gap-1.5">
          {Array.from({ length: count }).map((_, idx) => (
            <button
              key={idx}
              onClick={() => scrollTo(idx)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                current === idx
                  ? "w-6 bg-gradient-to-r from-orange-500 to-amber-400 shadow-[0_0_8px_rgba(249,115,22,0.6)]"
                  : "w-2 bg-zinc-800 hover:bg-zinc-700"
              }`}
              title={`Go to slide ${idx + 1}`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>

        <span className="text-[10px] text-zinc-600 font-mono tracking-tight">
          Ad {current + 1} of {count}
        </span>
      </div>
    </div>
  );
}
