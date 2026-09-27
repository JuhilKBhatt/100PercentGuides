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
    <div className="w-full max-w-4xl mx-auto py-6">
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
        <CarouselPrevious className="hidden md:flex border-white/10 bg-black/40 backdrop-blur-md hover:bg-primary hover:text-white" />
        <CarouselNext className="hidden md:flex border-white/10 bg-black/40 backdrop-blur-md hover:bg-primary hover:text-white" />
      </Carousel>
    </div>
  );
}
