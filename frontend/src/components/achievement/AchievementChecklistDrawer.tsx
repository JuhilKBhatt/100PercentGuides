"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Achievement, CollectibleGuide, CollectibleStepItem, GuideMeta } from "@/types";
import { getCollectibleGuide, deleteCollectibleGuide, listGameGuides } from "@/lib/api";
import { getAchievementTierInfo } from "@/utils/achievement";
import VectorGameMap from "@/components/map/VectorGameMap";
import {
  X,
  Edit2,
  Trash2,
  MapPin,
  Search,
  CheckCircle2,
  Circle,
  Trophy,
  Sparkles,
  Layers,
  RotateCcw,
  Check,
  Plus,
  Loader2,
  ExternalLink,
  Info,
  CheckSquare,
} from "lucide-react";

interface AchievementChecklistDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  achievement: Achievement | null;
  gameId: string;
  gameName?: string;
  guideMeta?: GuideMeta | null;
  onOpenCreator: (achievement: Achievement, existingGuide?: CollectibleGuide | null) => void;
  onGuideDeleted?: () => void;
  onChecklistProgressChange?: (achievementId: number, completedCount: number, totalCount: number) => void;
  onGuideCreated?: (newGuide: CollectibleGuide) => void;
}

const toCanonical = (str: string = "") =>
  str.toLowerCase().replace(/checklist$/i, "").replace(/[^a-z0-9]/g, "");

function matchGuideForAchievement(ach: Achievement, guideList: GuideMeta[]): GuideMeta | undefined {
  if (!ach || !guideList || guideList.length === 0) return undefined;

  const achIdNum = Number(ach.id);
  const achIdStr = String(ach.id).trim();
  const achApi = ach.steamApiName?.trim().toLowerCase();
  const achCanon = toCanonical(ach.name);

  for (const guide of guideList) {
    if (!guide) continue;

    if (guide.achievementId !== undefined && guide.achievementId !== null) {
      const gAchIdStr = String(guide.achievementId).trim();
      if (gAchIdStr === achIdStr || (!isNaN(achIdNum) && Number(guide.achievementId) === achIdNum)) {
        return guide;
      }
    }

    if (guide.achievementIds && Array.isArray(guide.achievementIds)) {
      for (const rawId of guide.achievementIds) {
        const rawStr = String(rawId).trim();
        if (rawStr === achIdStr || (!isNaN(achIdNum) && Number(rawId) === achIdNum)) {
          return guide;
        }
      }
    }

    if (guide.guideSlug) {
      const slugPrefixRemoved = guide.guideSlug.replace(/^ach-/, "").trim().toLowerCase();
      if (
        slugPrefixRemoved === achIdStr.toLowerCase() ||
        (!isNaN(achIdNum) && Number(slugPrefixRemoved) === achIdNum) ||
        (achApi && slugPrefixRemoved === achApi)
      ) {
        return guide;
      }
    }

    const guideCanon = toCanonical(guide.title);
    if (
      achCanon &&
      guideCanon &&
      (guideCanon === achCanon ||
        guideCanon.includes(achCanon) ||
        achCanon.includes(guideCanon))
    ) {
      return guide;
    }
  }

  return undefined;
}

export default function AchievementChecklistDrawer({
  isOpen,
  onClose,
  achievement,
  gameId,
  gameName = "Game",
  guideMeta,
  onOpenCreator,
  onGuideDeleted,
  onChecklistProgressChange,
  onGuideCreated,
}: AchievementChecklistDrawerProps) {
  const [guide, setGuide] = useState<CollectibleGuide | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "todo" | "done">("all");
  const [selectedRegion, setSelectedRegion] = useState<string>("all");
  const [showMap, setShowMap] = useState(true);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const activePollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const loadedTargetKeyRef = useRef<string | null>(null);
  const notifiedGuideSlugsRef = useRef<Set<string>>(new Set());

  const onGuideCreatedRef = useRef(onGuideCreated);
  useEffect(() => {
    onGuideCreatedRef.current = onGuideCreated;
  }, [onGuideCreated]);

  const onChecklistProgressChangeRef = useRef(onChecklistProgressChange);
  useEffect(() => {
    onChecklistProgressChangeRef.current = onChecklistProgressChange;
  }, [onChecklistProgressChange]);

  const stopPolling = useCallback(() => {
    if (activePollIntervalRef.current) {
      clearInterval(activePollIntervalRef.current);
      activePollIntervalRef.current = null;
    }
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  const effectiveAchievement: Achievement = achievement || {
    id: guideMeta?.achievementId ? (isNaN(Number(guideMeta.achievementId)) ? 0 : Number(guideMeta.achievementId)) : 0,
    name: guideMeta?.title || "100% Completion Checklist",
    description: "Step-by-step verified completion roadmap and milestones.",
    image: "",
    percent: "100.0",
  };

  const currentTargetKey = achievement
    ? `ach-${achievement.id}`
    : guideMeta?.guideSlug
    ? `slug-${guideMeta.guideSlug}`
    : null;

  const loadSavedProgress = useCallback(
    (g: CollectibleGuide) => {
      const storageKey = `100pg_guide_${gameId}_${g.guideSlug}`;
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          setCheckedItems(parsed);
          const foundCount = Object.values(parsed).filter(Boolean).length;
          onChecklistProgressChangeRef.current?.(effectiveAchievement.id, foundCount, g.totalCount);
        } else {
          setCheckedItems({});
        }
      } catch (e) {
        setCheckedItems({});
      }
    },
    [gameId, effectiveAchievement.id]
  );

  // Parallel Database / Cache Lookup Helper
  const fetchGuideFromDbOrCache = useCallback(
    async (targetAch: Achievement, explicitMeta?: GuideMeta | null): Promise<CollectibleGuide | null> => {
      // 1. Direct explicit meta lookup
      if (explicitMeta?.guideSlug) {
        try {
          const direct = await getCollectibleGuide(gameId, explicitMeta.guideSlug);
          if (direct && (direct.regions?.length > 0 || direct.title)) {
            return direct;
          }
        } catch (e) {}
      }

      // 2. Candidate slug checks (ach-ID, ach-STEAM_API_NAME)
      const candidateSlugs: string[] = [];
      if (targetAch.id !== undefined && targetAch.id !== null) {
        const sId = String(targetAch.id).trim();
        if (sId) candidateSlugs.push(`ach-${sId}`);
      }
      if (targetAch.steamApiName) {
        const apiSlug = `ach-${targetAch.steamApiName.trim().toLowerCase()}`;
        if (!candidateSlugs.includes(apiSlug)) candidateSlugs.push(apiSlug);
        const apiSlugRaw = `ach-${targetAch.steamApiName.trim()}`;
        if (!candidateSlugs.includes(apiSlugRaw)) candidateSlugs.push(apiSlugRaw);
      }

      for (const slug of candidateSlugs) {
        try {
          const direct = await getCollectibleGuide(gameId, slug);
          if (direct && (direct.regions?.length > 0 || direct.title)) {
            return direct;
          }
        } catch (e) {}
      }

      // 3. Fallback: Query all published guides for this game from DynamoDB/Redis
      try {
        const allGuides = await listGameGuides(gameId);
        if (allGuides && allGuides.length > 0) {
          const matched = matchGuideForAchievement(targetAch, allGuides);
          if (matched && matched.guideSlug) {
            const matchedGuide = await getCollectibleGuide(gameId, matched.guideSlug);
            if (matchedGuide && (matchedGuide.regions?.length > 0 || matchedGuide.title)) {
              return matchedGuide;
            }
          }
        }
      } catch (e) {
        console.warn("[AchievementChecklistDrawer] Database/cache guide list lookup:", e);
      }

      return null;
    },
    [gameId]
  );

  // Reset drawer state when closed
  useEffect(() => {
    if (!isOpen) {
      stopPolling();
      setIsGeneratingAi(false);
      setLoading(false);
      setGuide(null);
      loadedTargetKeyRef.current = null;
    }
  }, [isOpen, stopPolling]);

  // Load guide when drawer opens with a guideMeta or achievement
  useEffect(() => {
    if (!isOpen || !currentTargetKey) {
      return;
    }

    // Guard: Prevent repetitive re-fetching when the drawer already has the target guide
    if (loadedTargetKeyRef.current === currentTargetKey && guide !== null) {
      return;
    }

    let isCancelled = false;
    loadedTargetKeyRef.current = currentTargetKey;
    setLoading(true);
    setAiError(null);

    // Step 1: Immediate fetch from Database or Redis Cache
    fetchGuideFromDbOrCache(effectiveAchievement, guideMeta).then((cachedGuide: CollectibleGuide | null) => {
      if (isCancelled) return;

      if (cachedGuide) {
        // Guide found in DB or Cache! Immediately display without firing creation events
        setGuide(cachedGuide);
        loadSavedProgress(cachedGuide);
        setLoading(false);
        setIsGeneratingAi(false);
        stopPolling();
        return;
      }

      // Step 2: Not in DB/Cache yet. Kick off parallel AI generation AND parallel DB polling
      setLoading(false);
      setIsGeneratingAi(true);

      // Start Parallel Polling every 2.5s to catch writes from background seeder or worker
      stopPolling();
      activePollIntervalRef.current = setInterval(async () => {
        if (isCancelled) return;
        try {
          const polled = await fetchGuideFromDbOrCache(effectiveAchievement, guideMeta);
          if (polled && !isCancelled) {
            stopPolling();
            setGuide(polled);
            loadSavedProgress(polled);
            setIsGeneratingAi(false);
            if (polled.guideSlug && !notifiedGuideSlugsRef.current.has(polled.guideSlug)) {
              notifiedGuideSlugsRef.current.add(polled.guideSlug);
              onGuideCreatedRef.current?.(polled);
            }
          }
        } catch (e) {}
      }, 2500);

      // In Parallel: Request generation
      fetch("/api/ai/generate-guide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId,
          gameTitle: gameName,
          achievementId: achievement ? achievement.id : (guideMeta?.achievementId || "100-percent-roadmap"),
          achievementName: effectiveAchievement.name,
          achievementDescription: effectiveAchievement.description,
        }),
      })
        .then(async (res) => {
          if (isCancelled) return;
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
          }
          const data = await res.json();
          if (data && !data.error) {
            stopPolling();
            setGuide(data);
            loadSavedProgress(data);
            setIsGeneratingAi(false);
            if (data.guideSlug && !notifiedGuideSlugsRef.current.has(data.guideSlug)) {
              notifiedGuideSlugsRef.current.add(data.guideSlug);
              onGuideCreatedRef.current?.(data);
            }
          } else {
            // Check if DB/cache caught it in the meantime before declaring error
            const finalCheck = await fetchGuideFromDbOrCache(effectiveAchievement, guideMeta);
            if (finalCheck && !isCancelled) {
              stopPolling();
              setGuide(finalCheck);
              loadSavedProgress(finalCheck);
              setIsGeneratingAi(false);
              if (finalCheck.guideSlug && !notifiedGuideSlugsRef.current.has(finalCheck.guideSlug)) {
                notifiedGuideSlugsRef.current.add(finalCheck.guideSlug);
                onGuideCreatedRef.current?.(finalCheck);
              }
            } else if (!isCancelled) {
              stopPolling();
              setIsGeneratingAi(false);
              setAiError(data?.error || "Failed to generate AI checklist.");
            }
          }
        })
        .catch(async (err) => {
          if (isCancelled) return;
          console.warn("[AI Guide Auto-Generate Notice]", err);
          // Check DB one more time in case seeder wrote it right as generation failed/timed out
          const finalCheck = await fetchGuideFromDbOrCache(effectiveAchievement, guideMeta);
          if (finalCheck && !isCancelled) {
            stopPolling();
            setGuide(finalCheck);
            loadSavedProgress(finalCheck);
            setIsGeneratingAi(false);
            if (finalCheck.guideSlug && !notifiedGuideSlugsRef.current.has(finalCheck.guideSlug)) {
              notifiedGuideSlugsRef.current.add(finalCheck.guideSlug);
              onGuideCreatedRef.current?.(finalCheck);
            }
          } else if (!isCancelled) {
            stopPolling();
            setIsGeneratingAi(false);
            setAiError("Could not automatically generate checklist. You can create one manually or retry.");
          }
        });
    });

    return () => {
      isCancelled = true;
      stopPolling();
    };
  }, [
    isOpen,
    currentTargetKey,
    gameId,
    gameName,
    fetchGuideFromDbOrCache,
    loadSavedProgress,
    stopPolling,
  ]);

  // Retry generation action
  const handleRetryAiGeneration = async () => {
    setAiError(null);
    setIsGeneratingAi(true);

    stopPolling();
    activePollIntervalRef.current = setInterval(async () => {
      try {
        const polled = await fetchGuideFromDbOrCache(effectiveAchievement, guideMeta);
        if (polled) {
          stopPolling();
          setGuide(polled);
          loadSavedProgress(polled);
          setIsGeneratingAi(false);
          if (polled.guideSlug && !notifiedGuideSlugsRef.current.has(polled.guideSlug)) {
            notifiedGuideSlugsRef.current.add(polled.guideSlug);
            onGuideCreatedRef.current?.(polled);
          }
        }
      } catch (e) {}
    }, 2500);

    try {
      const res = await fetch("/api/ai/generate-guide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId,
          gameTitle: gameName,
          achievementId: achievement ? achievement.id : (guideMeta?.achievementId || "100-percent-roadmap"),
          achievementName: effectiveAchievement.name,
          achievementDescription: effectiveAchievement.description,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data && !data.error) {
        stopPolling();
        setGuide(data);
        loadSavedProgress(data);
        setIsGeneratingAi(false);
        if (data.guideSlug && !notifiedGuideSlugsRef.current.has(data.guideSlug)) {
          notifiedGuideSlugsRef.current.add(data.guideSlug);
          onGuideCreatedRef.current?.(data);
        }
      } else {
        const finalCheck = await fetchGuideFromDbOrCache(effectiveAchievement, guideMeta);
        if (finalCheck) {
          stopPolling();
          setGuide(finalCheck);
          loadSavedProgress(finalCheck);
          setIsGeneratingAi(false);
          if (finalCheck.guideSlug && !notifiedGuideSlugsRef.current.has(finalCheck.guideSlug)) {
            notifiedGuideSlugsRef.current.add(finalCheck.guideSlug);
            onGuideCreatedRef.current?.(finalCheck);
          }
        } else {
          stopPolling();
          setIsGeneratingAi(false);
          setAiError(data?.error || "Failed to generate AI checklist.");
        }
      }
    } catch (err: any) {
      const finalCheck = await fetchGuideFromDbOrCache(effectiveAchievement, guideMeta);
      if (finalCheck) {
        stopPolling();
        setGuide(finalCheck);
        loadSavedProgress(finalCheck);
        setIsGeneratingAi(false);
        if (finalCheck.guideSlug && !notifiedGuideSlugsRef.current.has(finalCheck.guideSlug)) {
          notifiedGuideSlugsRef.current.add(finalCheck.guideSlug);
          onGuideCreatedRef.current?.(finalCheck);
        }
      } else {
        stopPolling();
        setIsGeneratingAi(false);
        setAiError("Could not automatically generate checklist. You can create one manually or retry.");
      }
    }
  };

  // Save progress helper
  const updateCheckedItem = (itemId: number, isChecked: boolean) => {
    if (!guide) return;
    setCheckedItems((prev) => {
      const updated = { ...prev, [itemId]: isChecked };
      const storageKey = `100pg_guide_${gameId}_${guide.guideSlug}`;
      try {
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch (e) {}

      const foundCount = Object.values(updated).filter(Boolean).length;
      if (achievement && onChecklistProgressChange) {
        onChecklistProgressChange(achievement.id, foundCount, guide.totalCount);
      }
      return updated;
    });
  };

  const toggleCheck = (itemId: number) => {
    updateCheckedItem(itemId, !checkedItems[itemId]);
  };

  const handleReset = () => {
    if (!guide) return;
    if (window.confirm(`Reset checklist progress for '${guide.title}'?`)) {
      const storageKey = `100pg_guide_${gameId}_${guide.guideSlug}`;
      localStorage.removeItem(storageKey);
      setCheckedItems({});
      if (achievement && onChecklistProgressChange) {
        onChecklistProgressChange(achievement.id, 0, guide.totalCount);
      }
    }
  };

  const handleDelete = async () => {
    if (!guide) return;
    if (window.confirm(`Are you sure you want to delete the checklist '${guide.title}'?`)) {
      const res = await deleteCollectibleGuide(gameId, guide.guideSlug);
      if (res.success) {
        setGuide(null);
        if (onGuideDeleted) onGuideDeleted();
        onClose();
      }
    }
  };

  // Scroll to step card when pin selected
  const handleSelectPin = (id: number) => {
    setSelectedItemId(id);
    const element = document.getElementById(`drawer-step-${id}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  // Counts and metrics
  const allItems = useMemo(() => {
    return guide?.regions ? guide.regions.flatMap((r) => r.items) : [];
  }, [guide?.regions]);

  const hasMap = useMemo(() => {
    if (!guide) return false;
    const hasDirectImage = Boolean(guide.mapImageUrl && guide.mapImageUrl.trim().length > 0);
    const hasMapsWithImage = Boolean(guide.maps && guide.maps.some((m) => m.imageUrl && m.imageUrl.trim().length > 0));
    const hasVectors = Boolean(guide.mapVectors && (guide.mapVectors.land || guide.mapVectors.water || guide.mapVectors.river));
    return hasDirectImage || hasMapsWithImage || hasVectors;
  }, [guide]);

  const totalCount = guide?.totalCount || 0;
  const foundCount = useMemo(() => {
    return Object.values(checkedItems).filter(Boolean).length;
  }, [checkedItems]);
  const progressPercentage = totalCount > 0 ? Math.round((foundCount / totalCount) * 100) : 0;
  const isAllComplete = totalCount > 0 && foundCount >= totalCount;

  // Filtered regions and steps
  const filteredRegions = useMemo(() => {
    if (!guide?.regions) return [];
    const q = searchQuery.toLowerCase().trim();

    return guide.regions
      .filter((r) => selectedRegion === "all" || r.name === selectedRegion)
      .map((r) => {
        const items = r.items.filter((item) => {
          const isDone = !!checkedItems[item.id];
          if (statusFilter === "todo" && isDone) return false;
          if (statusFilter === "done" && !isDone) return false;

          if (q) {
            const matches =
              item.name.toLowerCase().includes(q) ||
              item.locationText.toLowerCase().includes(q) ||
              item.region.toLowerCase().includes(q) ||
              String(item.id) === q;
            if (!matches) return false;
          }
          return true;
        });
        return { ...r, items };
      })
      .filter((r) => r.items.length > 0);
  }, [guide?.regions, selectedRegion, statusFilter, searchQuery, checkedItems]);

  if (!isOpen || (!achievement && !guideMeta?.guideSlug && !guide)) return null;

  const tierInfo = getAchievementTierInfo(effectiveAchievement.percent);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Dark backdrop overlay */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Slide-over Drawer Panel */}
      <div className="fixed inset-y-0 right-0 max-w-2xl sm:max-w-3xl w-full bg-zinc-950 border-l border-zinc-800 shadow-2xl flex flex-col z-50 animate-in slide-in-from-right duration-300">
        {/* Top Header Bar */}
        <div className="p-5 border-b border-zinc-800/80 bg-black/80 backdrop-blur-md flex items-start justify-between gap-4 shrink-0">
          <div className="flex items-start gap-3.5 min-w-0">
            {/* Achievement Icon */}
            <div className="relative shrink-0 mt-0.5">
              {effectiveAchievement.image ? (
                <img
                  src={effectiveAchievement.image}
                  alt={effectiveAchievement.name}
                  className="w-11 h-11 rounded-lg object-cover border border-zinc-800 shadow-md"
                />
              ) : (
                <div className="w-11 h-11 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-zinc-600" />
                </div>
              )}
              {effectiveAchievement.hidden && (
                <div className="absolute -top-1 -left-1 bg-amber-500 text-black rounded-full p-0.5 shadow-md">
                  <Sparkles className="w-2.5 h-2.5" />
                </div>
              )}
            </div>

            {/* Achievement Meta */}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${tierInfo.dotClass} ${tierInfo.glowClass}`} />
                <h2 className="text-xl font-bold font-outfit text-white truncate">
                  {effectiveAchievement.name}
                </h2>
                {effectiveAchievement.hidden && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    Secret
                  </span>
                )}
                {tierInfo.percentDisplay && (
                  <span className="text-xs font-mono text-zinc-500">
                    {tierInfo.percentDisplay}
                  </span>
                )}
              </div>

              <p className="text-xs text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                {effectiveAchievement.description || "Unlock this achievement by completing the checklist below."}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            {guide && (
              <>
                <button
                  onClick={() => onOpenCreator(effectiveAchievement, guide)}
                  className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900 border border-zinc-800 transition-colors"
                  title="Edit Checklist & Map"
                >
                  <Edit2 className="w-4 h-4" />
                </button>

                <button
                  onClick={handleDelete}
                  className="p-2 rounded-xl text-zinc-400 hover:text-red-400 hover:bg-red-500/10 border border-zinc-800 transition-colors"
                  title="Delete Checklist"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900 border border-zinc-800 transition-colors ml-1"
              title="Close drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Drawer Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-6">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-zinc-500">
              <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
              <p className="text-xs font-medium">Loading achievement checklist...</p>
            </div>
          ) : guide ? (
            /* Guide Exists */
            <div className="space-y-6">
              {/* Checklist Progress Dashboard */}
              <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 shadow-md space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-orange-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                      Step Checklist Progress
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold font-mono text-white">
                      <span className="text-emerald-400">{foundCount}</span>
                      <span className="text-zinc-600 font-normal"> / </span>
                      <span>{totalCount}</span>
                    </span>
                    <span className="text-xs font-semibold text-zinc-400">
                      ({progressPercentage}%)
                    </span>
                    {foundCount > 0 && (
                      <button
                        onClick={handleReset}
                        className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors ml-1 flex items-center gap-1"
                        title="Reset progress"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reset</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-2.5 bg-black/80 rounded-full border border-zinc-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 transition-all duration-500 ease-out shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>

                {isAllComplete && (
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>All checklist items checked off! Achievement completed.</span>
                  </div>
                )}
              </div>

              {/* Interactive Map (only if guide has a valid map or image) */}
              {hasMap && (
                <div className="border border-zinc-900 rounded-2xl overflow-hidden bg-black shadow-xl">
                  <div className="p-3 bg-zinc-900/60 border-b border-zinc-800/80 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-orange-400" />
                      <span className="text-xs font-bold text-white font-outfit uppercase tracking-wider">
                        Interactive Locations Map
                      </span>
                    </div>

                    <button
                      onClick={() => setShowMap(!showMap)}
                      className="text-xs font-medium text-zinc-400 hover:text-white transition-colors"
                    >
                      {showMap ? "Hide Map" : "Show Map"}
                    </button>
                  </div>

                  {showMap && (
                    <VectorGameMap
                      items={allItems}
                      imageUrl={guide.mapImageUrl}
                      maps={guide.maps}
                      vectors={guide.mapVectors}
                      viewBox={guide.mapViewBox}
                      checkedItems={checkedItems}
                      selectedItemId={selectedItemId}
                      onSelectPin={handleSelectPin}
                    />
                  )}
                </div>
              )}

              {/* Step Checklist Filters & Search */}
              <div className="space-y-3 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Status Filter Tabs */}
                  <div className="flex items-center gap-1 p-1 bg-black border border-zinc-900 rounded-xl w-fit">
                    <button
                      onClick={() => setStatusFilter("all")}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                        statusFilter === "all"
                          ? "bg-orange-500/20 text-orange-400 font-bold"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      All ({totalCount})
                    </button>
                    <button
                      onClick={() => setStatusFilter("todo")}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                        statusFilter === "todo"
                          ? "bg-orange-500/20 text-orange-400 font-bold"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      To-Do ({totalCount - foundCount})
                    </button>
                    <button
                      onClick={() => setStatusFilter("done")}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                        statusFilter === "done"
                          ? "bg-emerald-500/20 text-emerald-400 font-bold"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      Found ({foundCount})
                    </button>
                  </div>

                  {/* Search Box */}
                  <div className="relative flex-1 sm:w-60">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                    <input
                      type="text"
                      placeholder="Search steps or areas..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-black border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Region Filter Pills */}
                {guide.regions.length > 1 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    <button
                      onClick={() => setSelectedRegion("all")}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all ${
                        selectedRegion === "all"
                          ? "bg-zinc-800 text-white font-bold"
                          : "bg-black text-zinc-400 border border-zinc-900 hover:text-white"
                      }`}
                    >
                      All Regions
                    </button>
                    {guide.regions.map((reg) => (
                      <button
                        key={reg.id}
                        onClick={() => setSelectedRegion(reg.name)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all ${
                          selectedRegion === reg.name
                            ? "bg-orange-500/20 text-orange-400 border border-orange-500/40 font-bold"
                            : "bg-black text-zinc-400 border border-zinc-900 hover:text-white"
                        }`}
                      >
                        {reg.name} ({reg.items.filter((i) => checkedItems[i.id]).length}/{reg.itemCount})
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Step Cards List */}
              <div className="space-y-3">
                {filteredRegions.length > 0 ? (
                  filteredRegions.map((region) => (
                    <div key={region.id} className="space-y-2">
                      <div className="flex items-center gap-2 px-1 pt-2">
                        <MapPin className="w-3.5 h-3.5 text-orange-400" />
                        <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                          {region.name}
                        </h4>
                        <span className="text-[10px] text-zinc-500 font-mono">
                          ({region.items.filter((i) => checkedItems[i.id]).length}/{region.itemCount} completed)
                        </span>
                      </div>

                      <div className="space-y-2">
                        {region.items.map((item) => {
                          const isDone = !!checkedItems[item.id];
                          const isSelected = selectedItemId === item.id;

                          return (
                            <div
                              key={item.id}
                              id={`drawer-step-${item.id}`}
                              className={`p-3.5 rounded-xl border transition-all ${
                                isDone
                                  ? "bg-emerald-950/10 border-emerald-500/30"
                                  : isSelected
                                  ? "bg-zinc-900/90 border-orange-500 shadow-md shadow-orange-500/10"
                                  : "bg-black border-zinc-900 hover:border-zinc-800"
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                {/* Checkbox */}
                                <button
                                  onClick={() => toggleCheck(item.id)}
                                  className="mt-0.5 p-1 rounded-lg text-zinc-500 hover:text-white transition-colors shrink-0"
                                  title={isDone ? "Completed! Click to uncheck" : "Click to check off step"}
                                >
                                  {isDone ? (
                                    <CheckCircle2 className="w-5 h-5 text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.7)]" />
                                  ) : (
                                    <Circle className="w-5 h-5 text-zinc-700 hover:text-zinc-500 transition-colors" />
                                  )}
                                </button>

                                {/* Step Content */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-900 text-orange-400 border border-zinc-800 shrink-0">
                                      #{item.id}
                                    </span>
                                    <h5 className={`text-sm font-bold truncate ${isDone ? "text-emerald-200 line-through opacity-80" : "text-white"}`}>
                                      {item.name}
                                    </h5>
                                  </div>

                                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                                    {item.locationText}
                                  </p>

                                  {item.details && (
                                    <div className="mt-2 p-2 rounded-lg bg-zinc-900/60 border border-zinc-800/60 text-xs text-zinc-300 flex items-start gap-2">
                                      <Info className="w-3.5 h-3.5 text-orange-400 shrink-0 mt-0.5" />
                                      <span className="text-[11px] leading-relaxed">{item.details}</span>
                                    </div>
                                  )}

                                  {item.imageUrl && (
                                    <div className="mt-2">
                                      <img
                                        src={item.imageUrl}
                                        alt={item.name}
                                        className="h-28 w-auto rounded-lg object-cover border border-zinc-800 shadow"
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center bg-black border border-zinc-900 rounded-xl text-zinc-500 text-xs">
                    No steps match your search filter.
                  </div>
                )}
              </div>
            </div>
          ) : isGeneratingAi ? (
            /* Generating with Gemini 3.5 Flash Lite */
            <div className="py-20 flex flex-col items-center justify-center gap-5 text-center max-w-md mx-auto px-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/40 flex items-center justify-center shadow-lg shadow-orange-500/20">
                  <Sparkles className="w-8 h-8 text-orange-400 animate-spin" style={{ animationDuration: "3s" }} />
                </div>
                <div className="absolute inset-0 rounded-2xl bg-orange-500/20 blur-xl animate-pulse" />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-orange-500/20 text-orange-300 border border-orange-500/30">
                    Gemini 3.5 Flash Lite
                  </span>
                </div>
                <h3 className="font-outfit font-bold text-xl text-white">
                  Generating Verified Checklist
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Researching authenticated in-game milestones, locations, and interactive map pins for &ldquo;{effectiveAchievement.name}&rdquo;... Please wait.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-orange-400 font-mono bg-zinc-950 px-4 py-2 rounded-xl border border-zinc-800 shadow-md">
                <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
                <span>Validating requirements &amp; building steps...</span>
              </div>
            </div>
          ) : (
            /* No Guide Created Yet for This Achievement */
            <div className="py-16 text-center space-y-4 max-w-md mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center mx-auto text-orange-400 shadow-xl shadow-orange-500/10">
                <CheckSquare className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold font-outfit text-white">
                  No Checklist Created Yet
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Add step-by-step instructions, map locations, and drag-and-drop pins specifically for unlocking &quot;{effectiveAchievement.name}&quot;.
                </p>
              </div>

              <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={() => onOpenCreator(effectiveAchievement, null)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold text-black bg-gradient-to-r from-orange-500 via-amber-400 to-yellow-400 hover:from-orange-600 hover:to-yellow-500 shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Checklist & Map</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
