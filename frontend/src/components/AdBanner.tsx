import React from "react";

interface AdBannerProps {
  position: "top" | "bottom" | "inline";
}

export default function AdBanner({ position }: AdBannerProps) {
  const positionClasses = {
    top: "w-full flex justify-center py-4 bg-black/40 backdrop-blur-md border-b border-white/10",
    bottom: "w-full flex justify-center py-4 bg-black/40 backdrop-blur-md border-t border-white/10",
    inline: "w-full flex justify-center my-6",
  };

  return (
    <div className={positionClasses[position]}>
      <div className="relative flex flex-col items-center justify-center w-full max-w-[728px] h-[90px] bg-black/60 border border-white/10 rounded-lg overflow-hidden group">
        <span className="absolute top-1 left-2 text-[10px] text-muted-foreground uppercase tracking-widest">Advertisement</span>
        <div className="flex flex-col items-center opacity-70 group-hover:opacity-100 transition-opacity">
          <p className="font-bold font-outfit text-white tracking-wide">Premium Ad Space</p>
          <span className="text-sm text-primary">728 x 90</span>
        </div>
      </div>
    </div>
  );
}
