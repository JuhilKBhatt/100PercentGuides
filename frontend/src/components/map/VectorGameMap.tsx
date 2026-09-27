"use client";

import React, { useState, useRef } from "react";
import { CollectibleStepItem, MapVectors } from "@/types";
import { ZoomIn, ZoomOut, RotateCcw, MapPin as MapPinIcon } from "lucide-react";

interface VectorGameMapProps {
  viewBox: string;
  vectors?: MapVectors;
  items: CollectibleStepItem[];
  checkedItems: Record<number, boolean>;
  selectedItemId: number | null;
  onSelectPin: (id: number) => void;
  className?: string;
}

export default function VectorGameMap({
  viewBox,
  vectors,
  items,
  checkedItems,
  selectedItemId,
  onSelectPin,
  className = "",
}: VectorGameMapProps) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredItem, setHoveredItem] = useState<CollectibleStepItem | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const handleZoom = (factor: number) => {
    setZoom((prev) => Math.min(3.5, Math.max(0.8, prev * factor)));
  };

  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div className={`relative w-full rounded-2xl overflow-hidden bg-black border border-zinc-900 select-none shadow-2xl ${className}`} ref={containerRef}>
      {/* Zoom / Pan Controls Toolbar */}
      <div className="absolute top-3 right-3 z-30 flex flex-col gap-1.5 bg-black/90 backdrop-blur-md p-1.5 rounded-xl border border-zinc-800 shadow-xl">
        <button
          onClick={() => handleZoom(1.25)}
          className="p-2 text-zinc-300 hover:text-white hover:bg-zinc-800/60 rounded-lg transition-colors"
          title="Zoom In"
          aria-label="Zoom in"
        >
          <ZoomIn size={16} />
        </button>
        <button
          onClick={() => handleZoom(0.8)}
          className="p-2 text-zinc-300 hover:text-white hover:bg-zinc-800/60 rounded-lg transition-colors"
          title="Zoom Out"
          aria-label="Zoom out"
        >
          <ZoomOut size={16} />
        </button>
        <button
          onClick={handleReset}
          className="p-2 text-zinc-300 hover:text-orange-400 hover:bg-zinc-800/60 rounded-lg transition-colors"
          title="Reset View"
          aria-label="Reset map view"
        >
          <RotateCcw size={16} />
        </button>
      </div>

      {/* Map Legend & Active Hover Tooltip */}
      <div className="absolute bottom-3 left-3 z-30 pointer-events-none">
        {hoveredItem ? (
          <div className="bg-black/95 backdrop-blur-md border border-orange-500/40 p-2.5 rounded-xl shadow-2xl max-w-xs pointer-events-auto">
            <div className="flex items-center gap-1.5 text-xs font-bold text-orange-400">
              <MapPinIcon size={13} />
              <span>{hoveredItem.name}</span>
            </div>
            <p className="text-xs text-zinc-300 font-medium mt-0.5 line-clamp-1">{hoveredItem.locationText}</p>
            <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">{hoveredItem.region}</span>
          </div>
        ) : (
          <div className="flex items-center gap-3 bg-black/80 backdrop-blur-md border border-zinc-900 px-3 py-1.5 rounded-xl text-xs text-zinc-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-[0_0_6px_rgba(249,115,22,0.8)]"></span>
              To-Do
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]"></span>
              Found
            </span>
            <span className="text-zinc-600 font-mono text-[11px]">&bull; Click pin to focus</span>
          </div>
        )}
      </div>

      {/* Interactive SVG Canvas */}
      <div 
        className="w-full h-[480px] sm:h-[560px] cursor-grab active:cursor-grabbing flex items-center justify-center overflow-hidden bg-[#06080d]"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <svg
          viewBox={viewBox || "0 0 1024 1440"}
          className="w-full h-full max-h-[560px] transition-transform duration-75"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "center center",
          }}
        >
          {/* Ocean Base */}
          <rect width="100%" height="100%" fill="#06080d" />

          {/* San Andreas Landmass Outline */}
          {vectors?.land && (
            <path
              d={vectors.land}
              fill="#12161f"
              stroke="#1f2636"
              strokeWidth="2.5"
              className="drop-shadow-lg"
            />
          )}

          {/* Inland Water & Alamo Sea */}
          {vectors?.water && (
            <path
              d={vectors.water}
              fill="#06080d"
              stroke="#161d2b"
              strokeWidth="1.5"
            />
          )}

          {/* Rivers & Waterways */}
          {vectors?.river && (
            <path
              d={vectors.river}
              fill="none"
              stroke="#06080d"
              strokeWidth="3.5"
            />
          )}

          {/* Collectible Pins */}
          {items.map((item) => {
            const isDone = !!checkedItems[item.id];
            const isSelected = selectedItemId === item.id;

            return (
              <g
                key={item.id}
                className="cursor-pointer transition-all duration-200 group"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectPin(item.id);
                }}
                onMouseEnter={() => setHoveredItem(item)}
                onMouseLeave={() => setHoveredItem(null)}
              >
                {/* Selected Pulse Ring */}
                {isSelected && (
                  <circle
                    cx={item.x}
                    cy={item.y}
                    r="32"
                    fill="none"
                    stroke="#f97316"
                    strokeWidth="3"
                    className="animate-ping opacity-75"
                  />
                )}

                {/* Outer Shadow Ring */}
                <circle
                  cx={item.x}
                  cy={item.y}
                  r="18"
                  fill="none"
                  stroke="rgba(0,0,0,0.7)"
                  strokeWidth="3"
                />

                {/* Main Pin Bubble */}
                <circle
                  cx={item.x}
                  cy={item.y}
                  r="16"
                  fill={isDone ? "#eab308" : isSelected ? "#f97316" : "#f97316"}
                  stroke={isDone ? "#fef08a" : isSelected ? "#ffffff" : "#000000"}
                  strokeWidth="2"
                  className={`transition-transform duration-150 ${
                    isSelected ? "scale-125" : "group-hover:scale-115"
                  }`}
                  style={{
                    filter: isDone
                      ? "drop-shadow(0 0 8px rgba(234,179,8,0.9))"
                      : isSelected
                      ? "drop-shadow(0 0 12px rgba(249,115,22,1))"
                      : "drop-shadow(0 0 6px rgba(249,115,22,0.7))",
                  }}
                />

                {/* Pin Number */}
                <text
                  x={item.x}
                  y={item.y + 4.5}
                  textAnchor="middle"
                  fill="#000000"
                  fontSize="10"
                  fontWeight="800"
                  fontFamily="Inter, sans-serif"
                  className="pointer-events-none select-none"
                >
                  {item.id}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
