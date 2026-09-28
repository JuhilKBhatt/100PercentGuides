"use client";

import React, { useState, useMemo } from "react";
import { Achievement } from "@/types/game";
import { getAchievementTierInfo } from "@/utils/achievement";
import { Eye, EyeOff, Trophy, Sparkles, Search, Filter } from "lucide-react";

interface AchievementsListProps {
  achievements: Achievement[];
}

type FilterTab = "all" | "public" | "hidden";

export default function AchievementsList({ achievements }: AchievementsListProps) {
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [revealSpoilers, setRevealSpoilers] = useState(true);

  const hiddenCount = useMemo(() => achievements.filter((a) => a.hidden).length, [achievements]);
  const publicCount = achievements.length - hiddenCount;

  const filteredAchievements = useMemo(() => {
    return achievements.filter((ach) => {
      // Tab filter
      if (activeTab === "hidden" && !ach.hidden) return false;
      if (activeTab === "public" && ach.hidden) return false;

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = ach.name.toLowerCase().includes(q);
        const matchesDesc = ach.description.toLowerCase().includes(q);
        return matchesName || matchesDesc;
      }
      return true;
    });
  }, [achievements, activeTab, searchQuery]);

  return (
    <div>
      {/* Header and Controls */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-3xl font-bold font-outfit text-white flex items-center gap-3">
            <span className="w-2.5 h-7 rounded-full bg-gradient-to-b from-orange-500 to-yellow-400 inline-block"></span>
            Achievements ({achievements.length})
          </h2>
        </div>

        {/* Filter Tabs & Search Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-zinc-950 border border-zinc-900 rounded-xl w-fit">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "all"
                  ? "bg-gradient-to-r from-orange-500 to-amber-500 text-black shadow-md"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-900/60"
              }`}
            >
              All ({achievements.length})
            </button>
            <button
              onClick={() => setActiveTab("public")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "public"
                  ? "bg-gradient-to-r from-orange-500 to-amber-500 text-black shadow-md"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-900/60"
              }`}
            >
              Public ({publicCount})
            </button>
            <button
              onClick={() => setActiveTab("hidden")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === "hidden"
                  ? "bg-gradient-to-r from-amber-500 to-yellow-400 text-black shadow-md"
                  : "text-amber-400/90 hover:text-amber-300 hover:bg-amber-500/10"
              }`}
            >
              <EyeOff className="w-3.5 h-3.5" />
              Hidden / Secret ({hiddenCount})
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Box */}
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Filter achievements..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-900 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500/60 transition-colors"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Grid of Achievements */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredAchievements.length > 0 ? (
          filteredAchievements.map((ach) => {
            const tierInfo = getAchievementTierInfo(ach.percent);
            const isMasked = ach.hidden && !revealSpoilers;

            return (
              <div
                key={ach.id}
                className={`flex gap-4 p-4 bg-black border rounded-xl transition-all group relative overflow-hidden ${
                  ach.hidden
                    ? "border-amber-500/30 bg-gradient-to-r from-amber-500/[0.04] to-black hover:border-amber-400/60 hover:shadow-[0_0_25px_rgba(245,158,11,0.14)]"
                    : "border-zinc-900 hover:border-orange-500/50 hover:shadow-[0_0_25px_rgba(249,115,22,0.12)]"
                }`}
              >
                {/* Achievement Image Icon */}
                <div className="relative shrink-0">
                  {ach.image ? (
                    <img
                      src={ach.image}
                      alt={ach.name}
                      className={`w-16 h-16 rounded-lg object-cover shadow-md group-hover:scale-105 transition-transform border border-zinc-900 shrink-0 ${
                        isMasked ? "blur-md opacity-40" : ""
                      }`}
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-zinc-950 border border-zinc-900 shrink-0 flex items-center justify-center">
                      <Trophy className="w-6 h-6 text-zinc-700" />
                    </div>
                  )}

                  {ach.hidden && (
                    <div className="absolute -top-1.5 -left-1.5 bg-amber-500 text-black rounded-full p-1 shadow-md">
                      <EyeOff className="w-3 h-3" />
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-wrap">
                      <span
                        className={`w-2.5 h-2.5 rounded-full shrink-0 ${tierInfo.dotClass} ${tierInfo.glowClass}`}
                        title={tierInfo.tooltip}
                      />
                      <h4
                        className={`font-semibold transition-colors truncate ${
                          ach.hidden
                            ? "text-amber-100 group-hover:text-amber-300"
                            : "text-white group-hover:text-amber-400"
                        }`}
                      >
                        {ach.name}
                      </h4>

                      {ach.hidden && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wider uppercase bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                          Secret
                        </span>
                      )}
                    </div>

                    {tierInfo.percentDisplay && (
                      <span
                        className="text-[11px] font-medium text-zinc-500 shrink-0 font-mono"
                        title={tierInfo.tooltip}
                      >
                        {tierInfo.percentDisplay}
                      </span>
                    )}
                  </div>

                  <p
                    className={`text-sm mt-1 line-clamp-2 transition-all ${
                      isMasked
                        ? "blur-sm select-none text-zinc-600 cursor-pointer"
                        : "text-zinc-400"
                    }`}
                    onClick={() => {
                      if (isMasked) setRevealSpoilers(true);
                    }}
                    title={isMasked ? "Click to reveal secret description" : undefined}
                  >
                    {isMasked ? "Hidden secret storyline details. Click to reveal." : ach.description}
                  </p>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full py-12 text-center bg-zinc-950/60 rounded-xl border border-zinc-900">
            <p className="text-zinc-500 text-sm">
              {searchQuery
                ? `No achievements matching "${searchQuery}".`
                : activeTab === "hidden"
                ? "No hidden achievements found for this game."
                : "No achievements found."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
