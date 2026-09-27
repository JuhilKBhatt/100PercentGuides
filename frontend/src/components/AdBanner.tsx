import React from "react";

interface AdBannerProps {
  position: "top" | "bottom" | "inline";
}

export default function AdBanner({ position }: AdBannerProps) {
  const positionClasses = {
    top: "w-full flex justify-center py-4 bg-black border-b border-orange-500/20",
    bottom: "w-full flex justify-center py-4 bg-black border-t border-orange-500/20",
    inline: "w-full flex justify-center my-6",
  };

  return (
    <div className={positionClasses[position]}>
      <div className="relative flex flex-col items-center justify-center w-full max-w-[728px] h-[90px] bg-black border border-zinc-900 rounded-xl overflow-hidden group shadow-lg">
        <span className="absolute top-1 left-2.5 text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">Advertisement</span>
        <div className="flex flex-col items-center opacity-80 group-hover:opacity-100 transition-opacity">
          <p className="font-bold font-outfit text-white tracking-wide">Premium Ad Space</p>
          <span className="text-xs text-orange-400 font-medium mt-0.5">728 x 90</span>
        </div>
      </div>
    </div>
  );
}
