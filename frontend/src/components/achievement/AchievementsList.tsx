"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { Achievement } from "@/types/game";
import { getAchievementTierInfo } from "@/utils/achievement";
import { formatUnlockTime } from "@/utils/format";
import { useSteamAuth } from "@/context/SteamAuthContext";
import { SteamIcon } from "@/components/steam/SteamAuthButton";
import ManualSteamModal from "@/components/steam/ManualSteamModal";
import {
  EyeOff,
  Trophy,
  Sparkles,
  Search,
  Check,
  CheckCircle2,
  Circle,
  RefreshCw,
  AlertCircle,
  Key,
  ExternalLink,
  Target,
} from "lucide-react";

interface AchievementsListProps {
  achievements: Achievement[];
  steamAppId?: string;
  gameName?: string;
}

type FilterTab = "all" | "completed" | "todo" | "public" | "hidden";

interface SteamPlayerAchievementData {
  achieved: boolean;
  unlockTime: number;
}

export default function AchievementsList({
  achievements,
  steamAppId,
  gameName,
}: AchievementsListProps) {
  const { user, login } = useSteamAuth();
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [revealSpoilers, setRevealSpoilers] = useState(false);
  const [manualModalOpen, setManualModalOpen] = useState(false);

  // Steam sync state
  const [steamUnlockedMap, setSteamUnlockedMap] = useState<Map<string, SteamPlayerAchievementData>>(new Map());
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Local manual overrides (allows ticking achievements even without Steam or testing)
  const [localCompletedIds, setLocalCompletedIds] = useState<Set<number>>(new Set());

  // Load local completion storage
  useEffect(() => {
    if (typeof window !== "undefined" && (steamAppId || achievements[0]?.id)) {
      const storageKey = `100pg_local_achievements_${steamAppId || achievements[0]?.id}`;
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setLocalCompletedIds(new Set(parsed));
          }
        }
      } catch (e) {
        // ignore
      }
    }
  }, [steamAppId, achievements]);

  // Sync with Steam
  const fetchSteamAchievements = useCallback(async () => {
    if (!user?.steamId || !steamAppId) return;

    setIsSyncing(true);
    setSyncError(null);

    try {
      const res = await fetch(`/api/steam/player/${user.steamId}/achievements/${steamAppId}`, {
        cache: "no-store",
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        if (res.status === 403 || errData.error?.includes("Profile is not public") || errData.playerstats?.error?.includes("Profile is not public")) {
          setSyncError("Your Steam profile game details are set to Private. Change 'Game details' to Public in Steam Privacy Settings to sync achievements.");
        } else {
          setSyncError(errData.error || "Could not retrieve Steam achievements.");
        }
        return;
      }

      const data = await res.json();
      const stats = data.playerstats;

      if (!stats) {
        setSyncError("No achievement statistics found for this game.");
        return;
      }

      if (stats.success === false) {
        if (stats.error && stats.error.includes("Profile is not public")) {
          setSyncError("Your Steam profile is set to Private. Change 'Game details' to Public in Steam Privacy Settings to allow auto-checking.");
        } else {
          setSyncError(stats.error || "Steam player data unavailable.");
        }
        return;
      }

      const playerAchs = stats.achievements || [];
      const newMap = new Map<string, SteamPlayerAchievementData>();

      for (const ach of playerAchs) {
        if (ach.apiname) {
          newMap.set(ach.apiname.toLowerCase(), {
            achieved: ach.achieved === 1,
            unlockTime: ach.unlocktime || 0,
          });
        }
      }

      setSteamUnlockedMap(newMap);
      setLastSyncTime(new Date());
    } catch (err: any) {
      console.error("Steam sync failed:", err);
      setSyncError(err.message || "Failed to sync achievements with Steam.");
    } finally {
      setIsSyncing(false);
    }
  }, [user?.steamId, steamAppId]);

  // Auto-sync whenever user or steamAppId changes
  useEffect(() => {
    if (user?.steamId && steamAppId) {
      fetchSteamAchievements();
    } else {
      setSteamUnlockedMap(new Map());
      setSyncError(null);
      setLastSyncTime(null);
    }
  }, [user?.steamId, steamAppId, fetchSteamAchievements]);

  // Check achievement status
  const getAchievementStatus = useCallback(
    (ach: Achievement): { isCompleted: boolean; unlockTime: number; fromSteam: boolean } => {
      // 1. Check Steam sync
      if (user?.steamId && steamUnlockedMap.size > 0) {
        // Try steamApiName match
        if (ach.steamApiName) {
          const steamStatus = steamUnlockedMap.get(ach.steamApiName.toLowerCase());
          if (steamStatus?.achieved) {
            return { isCompleted: true, unlockTime: steamStatus.unlockTime, fromSteam: true };
          }
        }

        // Try normalized displayName match
        const nameKey = ach.name.trim().toLowerCase();
        const steamNameStatus = steamUnlockedMap.get(nameKey);
        if (steamNameStatus?.achieved) {
          return { isCompleted: true, unlockTime: steamNameStatus.unlockTime, fromSteam: true };
        }
      }

      // 2. Check local manual toggle
      if (localCompletedIds.has(ach.id)) {
        return { isCompleted: true, unlockTime: 0, fromSteam: false };
      }

      return { isCompleted: false, unlockTime: 0, fromSteam: false };
    },
    [user?.steamId, steamUnlockedMap, localCompletedIds]
  );

  // Toggle local completion
  const toggleLocalCompletion = (achId: number) => {
    setLocalCompletedIds((prev) => {
      const next = new Set(prev);
      if (next.has(achId)) {
        next.delete(achId);
      } else {
        next.add(achId);
      }

      if (typeof window !== "undefined" && (steamAppId || achievements[0]?.id)) {
        const storageKey = `100pg_local_achievements_${steamAppId || achievements[0]?.id}`;
        localStorage.setItem(storageKey, JSON.stringify(Array.from(next)));
      }
      return next;
    });
  };

  // Counts
  const completedCount = useMemo(() => {
    return achievements.filter((a) => getAchievementStatus(a).isCompleted).length;
  }, [achievements, getAchievementStatus]);

  const totalCount = achievements.length;
  const todoCount = totalCount - completedCount;
  const hiddenCount = useMemo(() => achievements.filter((a) => a.hidden).length, [achievements]);
  const publicCount = totalCount - hiddenCount;
  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Filtered and sorted achievements (uncompleted first, completed sorted to the bottom)
  const filteredAchievements = useMemo(() => {
    return achievements
      .filter((ach) => {
        const status = getAchievementStatus(ach);

        // Tab filter
        if (activeTab === "completed" && !status.isCompleted) return false;
        if (activeTab === "todo" && status.isCompleted) return false;
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
      })
      .sort((a, b) => {
        const aCompleted = getAchievementStatus(a).isCompleted ? 1 : 0;
        const bCompleted = getAchievementStatus(b).isCompleted ? 1 : 0;
        return aCompleted - bCompleted;
      });
  }, [achievements, activeTab, searchQuery, getAchievementStatus]);

  return (
    <div className="space-y-6">
      {/* Steam Sync Progress Bar & Login Banner */}
      {steamAppId && (
        <div className="bg-zinc-950/90 border border-zinc-800 rounded-2xl p-5 shadow-2xl backdrop-blur-md relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

          {user ? (
            /* Logged in with Steam */
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.personaName}
                        className="w-12 h-12 rounded-xl object-cover border border-emerald-500/50 shadow-md"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                        <SteamIcon className="w-6 h-6 text-zinc-400" />
                      </div>
                    )}
                    <span
                      className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-black shadow-[0_0_8px_rgba(16,185,129,0.9)]"
                      title="Steam Tracking Connected"
                    />
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{user.personaName}</span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        <Check className="w-2.5 h-2.5" /> Steam Synced
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {lastSyncTime
                        ? `Auto-checked at ${lastSyncTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                        : "Syncing profile..."}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-auto">
                  <div className="text-right">
                    <div className="text-lg font-bold font-mono text-white">
                      <span className="text-emerald-400">{completedCount}</span>
                      <span className="text-zinc-600 font-normal"> / </span>
                      <span>{totalCount}</span>
                    </div>
                    <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                      {completionPercentage}% Complete
                    </div>
                  </div>

                  <button
                    onClick={fetchSteamAchievements}
                    disabled={isSyncing}
                    className="p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 hover:border-orange-500/50 text-zinc-300 hover:text-white transition-all disabled:opacity-50"
                    title="Refresh Steam achievement sync"
                  >
                    <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin text-orange-400" : ""}`} />
                  </button>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5">
                <div className="w-full h-3 bg-black/80 rounded-full border border-zinc-800/80 p-0.5 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 transition-all duration-700 ease-out shadow-[0_0_12px_rgba(16,185,129,0.5)]"
                    style={{ width: `${completionPercentage}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] font-medium text-zinc-500">
                  <span>{completedCount} unlocked</span>
                  <span>{todoCount} remaining to 100%</span>
                </div>
              </div>

              {/* Warning if private */}
              {syncError && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                  <div className="space-y-1">
                    <p className="font-semibold text-amber-200">Steam Sync Note</p>
                    <p className="text-amber-300/90 leading-relaxed">{syncError}</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Not logged in with Steam */
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="flex items-start gap-3.5">
                <div className="p-3 rounded-2xl bg-[#171a21] border border-[#2a475e] text-cyan-400 shrink-0 shadow-lg shadow-black/60">
                  <SteamIcon className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold font-outfit text-white flex items-center gap-2">
                    Auto-Track Your Achievements with Steam
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-orange-500/15 text-orange-400 border border-orange-500/30">
                      New
                    </span>
                  </h3>
                  <p className="text-xs text-zinc-400 max-w-xl leading-relaxed">
                    Connect your Steam account to automatically check off your completed trophies in real-time, view official unlock dates, and filter remaining tasks for 100% completion.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  onClick={() => login()}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#171a21] hover:bg-[#1b2838] border border-[#2a475e] hover:border-[#66c0f4] text-white text-xs font-bold shadow-lg transition-all group"
                >
                  <SteamIcon className="w-4 h-4 text-[#66c0f4] group-hover:scale-110 transition-transform" />
                  <span>Sign in with Steam</span>
                </button>

                <button
                  onClick={() => setManualModalOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white text-xs font-semibold transition-all"
                >
                  <Key className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Enter Steam ID</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Header and Controls */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-3xl font-bold font-outfit text-white flex items-center gap-3">
            <span className="w-2.5 h-7 rounded-full bg-gradient-to-b from-orange-500 to-yellow-400 inline-block"></span>
            Achievements ({achievements.length})
          </h2>
        </div>

        {/* Filter Tabs & Search Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-zinc-950 border border-zinc-900 rounded-xl w-fit flex-wrap">
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
              onClick={() => setActiveTab("completed")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === "completed"
                  ? "bg-emerald-500 text-black shadow-md font-bold"
                  : "text-emerald-400/90 hover:text-emerald-300 hover:bg-emerald-500/10"
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              Completed ({completedCount})
            </button>

            <button
              onClick={() => setActiveTab("todo")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === "todo"
                  ? "bg-gradient-to-r from-orange-500 to-amber-500 text-black shadow-md"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-900/60"
              }`}
            >
              <Target className="w-3.5 h-3.5" />
              To-Do ({todoCount})
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
            const { isCompleted, unlockTime, fromSteam } = getAchievementStatus(ach);
            // If already completed by player, auto-reveal spoiler
            const isMasked = ach.hidden && !revealSpoilers && !isCompleted;

            return (
              <div
                key={ach.id}
                className={`flex gap-4 p-4 rounded-xl transition-all group relative overflow-hidden border ${
                  isCompleted
                    ? "border-emerald-500/40 bg-gradient-to-r from-emerald-950/20 via-zinc-950 to-black hover:border-emerald-400/70 hover:shadow-[0_0_25px_rgba(16,185,129,0.15)]"
                    : ach.hidden
                    ? "border-amber-500/30 bg-gradient-to-r from-amber-500/[0.04] to-black hover:border-amber-400/60 hover:shadow-[0_0_25px_rgba(245,158,11,0.14)]"
                    : "border-zinc-900 bg-black hover:border-orange-500/50 hover:shadow-[0_0_25px_rgba(249,115,22,0.12)]"
                }`}
              >
                {/* Left: Checkbox & Achievement Icon */}
                <div className="flex items-center gap-3 shrink-0">
                  {/* Interactive completion toggle */}
                  <button
                    onClick={() => toggleLocalCompletion(ach.id)}
                    className="p-1 rounded-lg text-zinc-500 hover:text-white transition-colors focus:outline-none"
                    title={isCompleted ? "Completed! Click to toggle manual state" : "Click to mark as completed"}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.7)]" />
                    ) : (
                      <Circle className="w-5 h-5 text-zinc-700 group-hover:text-zinc-500 transition-colors" />
                    )}
                  </button>

                  {/* Icon */}
                  <div className="relative">
                    {ach.image ? (
                      <img
                        src={ach.image}
                        alt={ach.name}
                        className={`w-14 h-14 rounded-lg object-cover shadow-md group-hover:scale-105 transition-transform border shrink-0 ${
                          isCompleted
                            ? "border-emerald-500/50"
                            : "border-zinc-900"
                        } ${isMasked ? "blur-md opacity-40" : ""}`}
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-zinc-950 border border-zinc-900 shrink-0 flex items-center justify-center">
                        <Trophy className="w-6 h-6 text-zinc-700" />
                      </div>
                    )}

                    {ach.hidden && !isCompleted && (
                      <div className="absolute -top-1.5 -left-1.5 bg-amber-500 text-black rounded-full p-1 shadow-md">
                        <EyeOff className="w-3 h-3" />
                      </div>
                    )}
                  </div>
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
                          isCompleted
                            ? "text-emerald-100 group-hover:text-emerald-300"
                            : ach.hidden
                            ? "text-amber-100 group-hover:text-amber-300"
                            : "text-white group-hover:text-amber-400"
                        }`}
                      >
                        {ach.name}
                      </h4>

                      {/* Completed badge */}
                      {isCompleted && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          <Check className="w-2.5 h-2.5" />
                          Unlocked
                        </span>
                      )}

                      {/* Secret badge */}
                      {ach.hidden && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wider uppercase bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                          Secret
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {tierInfo.percentDisplay && (
                        <span
                          className="text-[11px] font-medium text-zinc-500 shrink-0 font-mono"
                          title={tierInfo.tooltip}
                        >
                          {tierInfo.percentDisplay}
                        </span>
                      )}
                    </div>
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

                  {/* Unlock timestamp if from Steam */}
                  {isCompleted && unlockTime > 0 && (
                    <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-mono text-emerald-400/80">
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span>Unlocked on {formatUnlockTime(unlockTime)}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full py-12 text-center bg-zinc-950/60 rounded-xl border border-zinc-900">
            <p className="text-zinc-500 text-sm">
              {searchQuery
                ? `No achievements matching "${searchQuery}".`
                : activeTab === "completed"
                ? "No completed achievements yet. Check off achievements manually or sync with Steam!"
                : activeTab === "todo"
                ? "Congratulations! You completed all achievements in this view!"
                : activeTab === "hidden"
                ? "No hidden achievements found for this game."
                : "No achievements found."}
            </p>
          </div>
        )}
      </div>

      <ManualSteamModal
        isOpen={manualModalOpen}
        onClose={() => setManualModalOpen(false)}
      />
    </div>
  );
}
