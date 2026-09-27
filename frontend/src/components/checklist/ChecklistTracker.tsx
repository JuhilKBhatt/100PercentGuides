"use client";

import Link from "next/link";

import React, { useState, useEffect, useMemo } from "react";
import { 
  GameChecklist, 
  ChecklistCategory, 
  ChecklistItem, 
  UserChecklistProgress 
} from "@/types";
import { 
  loadChecklistProgress, 
  saveChecklistProgress, 
  resetChecklistProgress, 
  calculateProgressSummary 
} from "@/utils/checklistStorage";
import { 
  CheckCircle2, 
  Circle, 
  Plus, 
  Minus, 
  RotateCcw, 
  Filter, 
  ChevronDown, 
  ChevronRight, 
  Search, 
  Trophy, 
  Sparkles,
  MapPin
} from "lucide-react";

interface ChecklistTrackerProps {
  checklist: GameChecklist;
  gameName: string;
}

export default function ChecklistTracker({ checklist, gameName }: ChecklistTrackerProps) {
  const [progress, setProgress] = useState<UserChecklistProgress>({});
  const [isLoaded, setIsLoaded] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [filterMode, setFilterMode] = useState<"all" | "todo" | "done">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  // 1. Initial load from localStorage (SSR-safe)
  useEffect(() => {
    const saved = loadChecklistProgress(checklist.gameId);
    setProgress(saved);

    // Expand all categories by default
    const initialExpanded: Record<string, boolean> = {};
    checklist.categories.forEach((cat) => {
      initialExpanded[cat.id] = true;
    });
    setExpandedCategories(initialExpanded);
    setIsLoaded(true);
  }, [checklist.gameId, checklist.categories]);

  // 2. Compute progress summary
  const summary = useMemo(() => {
    return calculateProgressSummary(checklist, progress);
  }, [checklist, progress]);

  // 3. Actions
  const toggleItem = (itemId: string, maxRequired: number) => {
    setProgress((prev) => {
      const current = prev[itemId] || 0;
      const nextVal = current >= maxRequired ? 0 : maxRequired;
      const updated = { ...prev, [itemId]: nextVal };
      saveChecklistProgress(checklist.gameId, updated);
      return updated;
    });
  };

  const adjustCounter = (itemId: string, delta: number, maxRequired: number) => {
    setProgress((prev) => {
      const current = prev[itemId] || 0;
      const nextVal = Math.max(0, Math.min(maxRequired, current + delta));
      const updated = { ...prev, [itemId]: nextVal };
      saveChecklistProgress(checklist.gameId, updated);
      return updated;
    });
  };

  const handleReset = () => {
    if (window.confirm("Are you sure you want to reset your checklist progress for " + gameName + "?")) {
      resetChecklistProgress(checklist.gameId);
      setProgress({});
    }
  };

  const toggleCategoryExpand = (catId: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  // 4. Filter categories and items
  const filteredCategories = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return checklist.categories
      .filter((cat) => selectedCategory === "all" || cat.id === selectedCategory)
      .map((cat) => {
        const items = cat.items.filter((item) => {
          const userCount = progress[item.id] || 0;
          const isDone = userCount >= item.totalRequired;

          // Status filter
          if (filterMode === "todo" && isDone) return false;
          if (filterMode === "done" && !isDone) return false;

          // Search query
          if (q && !item.title.toLowerCase().includes(q) && !(item.description || "").toLowerCase().includes(q)) {
            return false;
          }

          return true;
        });

        return { ...cat, items };
      })
      .filter((cat) => cat.items.length > 0 || (searchQuery === "" && selectedCategory === cat.id));
  }, [checklist.categories, selectedCategory, filterMode, searchQuery, progress]);



  return (
    <div className="space-y-6">
      {/* Header & Sticky Progress Card */}
      <div className="p-6 bg-black border border-zinc-900 rounded-2xl shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <Trophy size={22} className="text-orange-400" />
              <h3 className="text-2xl font-bold font-outfit text-white">
                100% Completion Tracker
              </h3>
            </div>
            <p className="text-sm text-zinc-400">
              {summary.totalDone} of {summary.totalRequired} requirements completed &bull;{" "}
              <span className="text-orange-400 font-semibold">
                {summary.remaining} remaining
              </span>
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="text-3xl sm:text-4xl font-extrabold font-outfit bg-clip-text text-transparent bg-gradient-to-r from-orange-500 via-amber-400 to-yellow-400">
                {summary.percentage}%
              </span>
              <span className="block text-xs uppercase tracking-wider text-zinc-500 font-semibold">
                Completion
              </span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-zinc-950 rounded-full h-3.5 mt-5 overflow-hidden border border-zinc-800">
          <div 
            className="h-full bg-gradient-to-r from-orange-500 via-amber-400 to-yellow-400 transition-all duration-500 rounded-full shadow-[0_0_12px_rgba(249,115,22,0.8)]"
            style={{ width: `${summary.percentage}%` }}
          />
        </div>

        {summary.isComplete && (
          <div className="mt-4 p-3 bg-amber-400/10 border border-amber-400/30 rounded-xl flex items-center gap-2 text-amber-300 text-sm font-semibold">
            <Sparkles size={18} className="text-yellow-400" />
            <span>Congratulations! You have completed 100% of this game!</span>
          </div>
        )}
      </div>

      {/* Controls Bar: Search, Category Tabs & Status Filter */}
      <div className="space-y-4">
        {/* Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all whitespace-nowrap border ${
              selectedCategory === "all"
                ? "bg-orange-500 text-black font-bold border-orange-500 shadow-md shadow-orange-500/20"
                : "bg-black text-zinc-300 border-zinc-900 hover:border-zinc-800 hover:text-white"
            }`}
          >
            All Categories ({checklist.totalRequirements})
          </button>
          {checklist.categories.map((cat) => {
            const stat = summary.categoryStats[cat.id];
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all whitespace-nowrap border flex items-center gap-2 ${
                  isSelected
                    ? "bg-orange-500 text-black font-bold border-orange-500 shadow-md shadow-orange-500/20"
                    : "bg-black text-zinc-300 border-zinc-900 hover:border-zinc-800 hover:text-white"
                }`}
              >
                <span>{cat.name}</span>
                <span className={`text-[11px] px-1.5 py-0.2 rounded-md ${
                  isSelected ? "bg-black/30 text-black" : "bg-zinc-900 text-zinc-400"
                }`}>
                  {stat ? `${stat.done}/${stat.total}` : cat.totalItems}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & Filter Mode */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
            <input
              type="text"
              placeholder="Filter requirements..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 text-sm bg-black border border-zinc-900 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500/50 transition-colors"
            />
          </div>

          {/* Quick Toggles */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <div className="flex items-center bg-zinc-950 p-1 rounded-xl border border-zinc-900">
              <button
                onClick={() => setFilterMode("all")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  filterMode === "all" ? "bg-orange-500/20 text-orange-400" : "text-zinc-400 hover:text-white"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterMode("todo")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  filterMode === "todo" ? "bg-orange-500/20 text-orange-400" : "text-zinc-400 hover:text-white"
                }`}
              >
                To-Do
              </button>
              <button
                onClick={() => setFilterMode("done")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  filterMode === "done" ? "bg-orange-500/20 text-orange-400" : "text-zinc-400 hover:text-white"
                }`}
              >
                Done
              </button>
            </div>

            <button
              onClick={handleReset}
              title="Reset Checklist Progress"
              className="p-2 text-zinc-500 hover:text-red-400 transition-colors bg-zinc-950 border border-zinc-900 rounded-xl"
            >
              <RotateCcw size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Accordion Categories */}
      <div className="space-y-4">
        {filteredCategories.map((cat) => {
          const stat = summary.categoryStats[cat.id];
          const isExpanded = expandedCategories[cat.id] ?? true;

          return (
            <div key={cat.id} className="border border-zinc-900 bg-black rounded-2xl overflow-hidden shadow-lg">
              {/* Category Header */}
              <button
                onClick={() => toggleCategoryExpand(cat.id)}
                className="w-full flex items-center justify-between p-4 sm:p-5 text-left hover:bg-zinc-950/60 transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="text-zinc-400 group-hover:text-orange-400 transition-colors">
                    {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                  </div>
                  <div>
                    <h4 className="font-bold font-outfit text-lg text-white group-hover:text-amber-400 transition-colors">
                      {cat.name}
                    </h4>
                    {cat.description && (
                      <p className="text-xs text-zinc-500 line-clamp-1 mt-0.5">
                        {cat.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="hidden sm:flex items-center gap-2">
                    <div className="w-24 bg-zinc-900 rounded-full h-2 overflow-hidden border border-zinc-800">
                      <div 
                        className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full transition-all duration-300" 
                        style={{ width: `${stat?.percentage || 0}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono">
                    {stat ? `${stat.done}/${stat.total}` : cat.totalItems}
                  </span>
                </div>
              </button>

              {/* Items List */}
              {isExpanded && (
                <div className="border-t border-zinc-900 divide-y divide-zinc-900/60">
                  {cat.items.map((item) => {
                    const userCount = progress[item.id] || 0;
                    const isDone = userCount >= item.totalRequired;
                    const isCounter = item.totalRequired > 1;

                    return (
                      <div 
                        key={item.id} 
                        className={`p-3.5 sm:p-4 flex items-center justify-between gap-4 transition-colors ${
                          isDone ? "bg-zinc-950/40 opacity-75" : "hover:bg-zinc-950/30"
                        }`}
                      >
                        {/* Title & Description */}
                        <div 
                          className="flex items-start gap-3 flex-1 min-w-0 cursor-pointer select-none"
                          onClick={() => {
                            if (!isCounter) {
                              toggleItem(item.id, item.totalRequired);
                            }
                          }}
                        >
                          <div className="pt-0.5 shrink-0">
                            {isDone ? (
                              <CheckCircle2 size={19} className="text-amber-400 fill-amber-400/20" />
                            ) : (
                              <Circle size={19} className="text-zinc-600 hover:text-orange-400 transition-colors" />
                            )}
                          </div>
                          <div>
                            <p className={`text-sm font-semibold transition-colors ${
                              isDone ? "text-zinc-400 line-through decoration-zinc-600" : "text-white"
                            }`}>
                              {item.title}
                            </p>
                            {item.description && (
                              <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">
                                {item.description}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Interactive Controls */}
                        <div className="flex items-center gap-2 shrink-0">
                          {item.guideUrl && (
                            <Link
                              href={item.guideUrl}
                              className="text-xs px-2.5 py-1.5 rounded-lg bg-orange-500/15 border border-orange-500/40 text-orange-300 hover:bg-orange-500 hover:text-black font-bold flex items-center gap-1.5 transition-all shadow-sm"
                              title="Open Interactive Map & Step-by-Step Guide"
                            >
                              <MapPin size={13} />
                              <span className="hidden sm:inline">Map & Guide</span>
                            </Link>
                          )}
                          {isCounter ? (
                            <div className="flex items-center gap-1.5 bg-zinc-950 px-2 py-1 rounded-lg border border-zinc-800">
                              <button
                                onClick={() => adjustCounter(item.id, -1, item.totalRequired)}
                                disabled={userCount <= 0}
                                className="p-1 text-zinc-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
                              >
                                <Minus size={13} />
                              </button>
                              <span className={`text-xs font-mono font-bold px-1.5 min-w-[50px] text-center ${
                                isDone ? "text-amber-400" : "text-zinc-300"
                              }`}>
                                {userCount} / {item.totalRequired}
                              </span>
                              <button
                                onClick={() => adjustCounter(item.id, 1, item.totalRequired)}
                                disabled={userCount >= item.totalRequired}
                                className="p-1 text-zinc-400 hover:text-orange-400 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                              >
                                <Plus size={13} />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => toggleItem(item.id, item.totalRequired)}
                              className={`text-xs font-semibold px-2.5 py-1 rounded-md border transition-all ${
                                isDone 
                                  ? "bg-amber-400/10 border-amber-400/30 text-amber-300" 
                                  : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white"
                              }`}
                            >
                              {isDone ? "Done" : "Check"}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
