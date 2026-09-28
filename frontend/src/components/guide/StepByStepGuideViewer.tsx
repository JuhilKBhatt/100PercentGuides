"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { CollectibleGuide, CollectibleStepItem } from "@/types";
import VectorGameMap from "@/components/map/VectorGameMap";
import { 
  loadChecklistProgress, 
  saveChecklistProgress 
} from "@/utils/checklistStorage";
import { 
  CheckCircle2, 
  Circle, 
  MapPin, 
  Search, 
  RotateCcw, 
  CheckSquare, 
  Filter, 
  Trophy 
} from "lucide-react";

interface StepByStepGuideViewerProps {
  guide: CollectibleGuide;
  gameName: string;
}

export default function StepByStepGuideViewer({ guide, gameName }: StepByStepGuideViewerProps) {
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"all" | "todo" | "done">("all");
  const [activeMapId, setActiveMapId] = useState<string>(guide.maps?.[0]?.id || "map-1");

  // Flatten all items across regions for easy lookups
  const allItems = useMemo(() => {
    return guide.regions.flatMap((r) => r.items);
  }, [guide.regions]);

  // 1. Initial load from localStorage (synced with parent checklist)
  useEffect(() => {
    const storageKey = `100pg_guide_${guide.gameId}_${guide.guideSlug}`;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        setCheckedItems(JSON.parse(raw));
      }
    } catch (e) {
      console.error("Failed to load guide progress:", e);
    }
  }, [guide.gameId, guide.guideSlug]);

  // Save progress helper
  const updateCheckedItem = (itemId: number, isChecked: boolean) => {
    setCheckedItems((prev) => {
      const updated = { ...prev, [itemId]: isChecked };
      const storageKey = `100pg_guide_${guide.gameId}_${guide.guideSlug}`;
      localStorage.setItem(storageKey, JSON.stringify(updated));

      // Also sync total count to main game checklist under item key 'col_spaceship_parts'
      const totalFound = Object.values(updated).filter(Boolean).length;
      const mainProgress = loadChecklistProgress(guide.gameId);
      mainProgress[`col_${guide.guideSlug.replace(/-/g, "_")}`] = totalFound;
      saveChecklistProgress(guide.gameId, mainProgress);

      return updated;
    });
  };

  const toggleCheck = (itemId: number) => {
    updateCheckedItem(itemId, !checkedItems[itemId]);
  };

  const handleReset = () => {
    if (window.confirm(`Reset progress for ${guide.title}?`)) {
      const storageKey = `100pg_guide_${guide.gameId}_${guide.guideSlug}`;
      localStorage.removeItem(storageKey);
      setCheckedItems({});
      
      const mainProgress = loadChecklistProgress(guide.gameId);
      delete mainProgress[`col_${guide.guideSlug.replace(/-/g, "_")}`];
      saveChecklistProgress(guide.gameId, mainProgress);
    }
  };

  // Focus and scroll to item
  const handleSelectPin = (id: number) => {
    setSelectedItemId(id);
    const element = document.getElementById(`step-item-${id}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  // Metrics
  const foundCount = useMemo(() => {
    return Object.values(checkedItems).filter(Boolean).length;
  }, [checkedItems]);

  const percentage = guide.totalCount > 0 ? Math.round((foundCount / guide.totalCount) * 100) : 0;

  // Filter items
  const filteredRegions = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return guide.regions
      .filter((r) => selectedRegion === "all" || r.name === selectedRegion)
      .map((r) => {
        const items = r.items.filter((item) => {
          const isDone = !!checkedItems[item.id];
          if (statusFilter === "todo" && isDone) return false;
          if (statusFilter === "done" && !isDone) return false;

          if (q) {
            const matchesQuery = 
              item.name.toLowerCase().includes(q) ||
              item.locationText.toLowerCase().includes(q) ||
              item.region.toLowerCase().includes(q) ||
              String(item.id) === q;
            if (!matchesQuery) return false;
          }

          return true;
        });

        return { ...r, items };
      })
      .filter((r) => r.items.length > 0);
  }, [guide.regions, selectedRegion, statusFilter, searchQuery, checkedItems]);

  return (
    <div className="space-y-8">
      {/* Top Banner & Progress Header */}
      <div className="p-6 bg-black border border-zinc-900 rounded-2xl shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Trophy size={20} className="text-orange-400" />
              <span className="text-xs uppercase tracking-wider text-orange-400 font-bold">
                {gameName} &bull; 100% Collectible Guide
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold font-outfit text-white tracking-tight">
              {guide.title}
            </h1>
            {guide.subtitle && (
              <p className="text-sm text-zinc-400 mt-1">
                {guide.subtitle}
              </p>
            )}
          </div>

          <div className="flex items-center gap-5">
            <div className="text-right">
              <span className="text-3xl sm:text-4xl font-extrabold font-outfit bg-clip-text text-transparent bg-gradient-to-r from-orange-500 via-amber-400 to-yellow-400">
                {foundCount} / {guide.totalCount}
              </span>
              <span className="block text-xs uppercase tracking-wider text-zinc-500 font-semibold">
                {percentage}% Found
              </span>
            </div>

            <button
              onClick={handleReset}
              title="Reset Guide Progress"
              className="p-2.5 text-zinc-400 hover:text-red-400 transition-colors bg-zinc-950 border border-zinc-800 rounded-xl"
            >
              <RotateCcw size={18} />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-zinc-950 rounded-full h-3 mt-5 overflow-hidden border border-zinc-800">
          <div 
            className="h-full bg-gradient-to-r from-orange-500 via-amber-400 to-yellow-400 transition-all duration-500 rounded-full shadow-[0_0_12px_rgba(249,115,22,0.8)]"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Interactive Vector Game Map */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold font-outfit text-white flex items-center gap-2">
            <MapPin size={20} className="text-orange-400" />
            <span>Interactive Locations Map</span>
          </h2>
          <span className="text-xs text-zinc-400">Click any pin to highlight location details</span>
        </div>

        <VectorGameMap
          viewBox={guide.mapViewBox}
          vectors={guide.mapVectors}
          imageUrl={guide.mapImageUrl}
          maps={guide.maps}
          activeMapId={activeMapId}
          onSelectMap={setActiveMapId}
          items={allItems}
          checkedItems={checkedItems}
          selectedItemId={selectedItemId}
          onSelectPin={handleSelectPin}
        />
      </div>

      {/* Step-by-Step Checklist Controls */}
      <div className="space-y-4">
        {/* Region Filter Buttons */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setSelectedRegion("all")}
            className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all whitespace-nowrap border ${
              selectedRegion === "all"
                ? "bg-orange-500 text-black font-bold border-orange-500 shadow-md shadow-orange-500/20"
                : "bg-black text-zinc-300 border-zinc-900 hover:border-zinc-800 hover:text-white"
            }`}
          >
            All Regions ({guide.totalCount})
          </button>
          {guide.regions.map((reg) => {
            const isSelected = selectedRegion === reg.name;
            const regFound = reg.items.filter((i) => checkedItems[i.id]).length;
            return (
              <button
                key={reg.id}
                onClick={() => setSelectedRegion(reg.name)}
                className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all whitespace-nowrap border flex items-center gap-2 ${
                  isSelected
                    ? "bg-orange-500 text-black font-bold border-orange-500 shadow-md shadow-orange-500/20"
                    : "bg-black text-zinc-300 border-zinc-900 hover:border-zinc-800 hover:text-white"
                }`}
              >
                <span>{reg.name}</span>
                <span className={`text-[11px] px-1.5 py-0.2 rounded-md ${
                  isSelected ? "bg-black/30 text-black" : "bg-zinc-900 text-zinc-400"
                }`}>
                  {regFound}/{reg.itemCount}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & Status Filter Mode */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
            <input
              type="text"
              placeholder="Search parts by number, location, or area..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 text-sm bg-black border border-zinc-900 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500/50 transition-colors"
            />
          </div>

          <div className="flex items-center bg-zinc-950 p-1 rounded-xl border border-zinc-900 w-full sm:w-auto justify-end">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === "all" ? "bg-orange-500/20 text-orange-400" : "text-zinc-400 hover:text-white"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter("todo")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === "todo" ? "bg-orange-500/20 text-orange-400" : "text-zinc-400 hover:text-white"
              }`}
            >
              To-Do
            </button>
            <button
              onClick={() => setStatusFilter("done")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === "done" ? "bg-orange-500/20 text-orange-400" : "text-zinc-400 hover:text-white"
              }`}
            >
              Found
            </button>
          </div>
        </div>
      </div>

      {/* Step-by-Step Checklist Grouped by Region */}
      <div className="space-y-6">
        {filteredRegions.map((region) => (
          <div key={region.id} className="border border-zinc-900 bg-black rounded-2xl overflow-hidden shadow-lg">
            {/* Region Title */}
            <div className="p-4 sm:p-5 bg-zinc-950/80 border-b border-zinc-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin size={17} className="text-orange-400" />
                <h3 className="font-bold font-outfit text-lg text-white">{region.name}</h3>
              </div>
              <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-md bg-zinc-900 text-zinc-400 border border-zinc-800">
                {region.items.filter((i) => checkedItems[i.id]).length} / {region.itemCount} Found
              </span>
            </div>

            {/* Region Items Table / Rows */}
            <div className="divide-y divide-zinc-900/70">
              {region.items.map((item) => {
                const isDone = !!checkedItems[item.id];
                const isSelected = selectedItemId === item.id;

                return (
                  <div
                    key={item.id}
                    id={`step-item-${item.id}`}
                    className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                      isSelected
                        ? "bg-orange-500/10 border-l-4 border-l-orange-500"
                        : isDone
                        ? "bg-zinc-950/40 opacity-80"
                        : "hover:bg-zinc-950/30"
                    }`}
                  >
                    {/* Item Number & Location Info */}
                    <div className="flex items-start gap-3.5 flex-1 min-w-0">
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 border ${
                        isDone
                          ? "bg-amber-400/20 border-amber-400/40 text-amber-300"
                          : isSelected
                          ? "bg-orange-500 text-black border-orange-500 font-extrabold"
                          : "bg-zinc-900 border-zinc-800 text-white"
                      }`}>
                        {item.id}
                      </span>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className={`text-base font-semibold transition-colors ${
                            isDone ? "text-zinc-400 line-through decoration-zinc-600" : "text-white"
                          }`}>
                            {item.name}
                          </h4>
                          <span className="text-[11px] text-zinc-500 font-medium px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800/80">
                            {item.region}
                          </span>
                        </div>

                        <p className="text-sm text-zinc-300 mt-1 font-medium">
                          {item.locationText}
                        </p>
                        {item.details && (
                          <p className="text-xs text-zinc-500 mt-0.5">
                            {item.details}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions: View on Map & Mark Found Checkbox */}
                    <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                      <button
                        onClick={() => setSelectedItemId(item.id)}
                        className={`text-xs px-3 py-1.5 rounded-lg border flex items-center gap-1.5 transition-all ${
                          isSelected
                            ? "bg-orange-500 text-black font-bold border-orange-500"
                            : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700"
                        }`}
                      >
                        <MapPin size={13} />
                        <span>Map Pin</span>
                      </button>

                      <button
                        onClick={() => toggleCheck(item.id)}
                        className={`text-xs font-semibold px-4 py-1.5 rounded-lg border flex items-center gap-2 transition-all ${
                          isDone
                            ? "bg-amber-400/15 border-amber-400/40 text-amber-300 shadow-sm"
                            : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:border-orange-500/40"
                        }`}
                      >
                        {isDone ? (
                          <>
                            <CheckCircle2 size={15} className="text-amber-400" />
                            <span>Found</span>
                          </>
                        ) : (
                          <>
                            <Circle size={15} className="text-zinc-500" />
                            <span>Mark Found</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
