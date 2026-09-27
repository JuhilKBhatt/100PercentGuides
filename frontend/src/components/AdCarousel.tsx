"use client";

import React from "react";
import AdBanner from "./AdBanner";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";

export default function AdCarousel() {
  const plugin = React.useRef(
    Autoplay({ delay: 5000, stopOnInteraction: true })
  );

  return (
    <div className="w-full max-w-4xl mx-auto py-4">
      <Carousel
        plugins={[plugin.current]}
        className="w-full"
        onMouseEnter={plugin.current.stop}
        onMouseLeave={plugin.current.reset}
      >
        <CarouselContent>
          <CarouselItem>
            <div className="p-1">
              <AdBanner position="inline" />
            </div>
          </CarouselItem>
          <CarouselItem>
            <div className="p-1">
              <AdBanner position="inline" />
            </div>
          </CarouselItem>
          <CarouselItem>
            <div className="p-1">
              <AdBanner position="inline" />
            </div>
          </CarouselItem>
        </CarouselContent>
        <CarouselPrevious className="hidden md:flex border-orange-500/30 bg-black text-orange-400 hover:bg-orange-500 hover:text-black transition-colors" />
        <CarouselNext className="hidden md:flex border-orange-500/30 bg-black text-orange-400 hover:bg-orange-500 hover:text-black transition-colors" />
      </Carousel>
    </div>
  );
}
