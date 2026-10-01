"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { Achievement, GuideMeta, CollectibleGuide } from "@/types";
import { getAchievementTierInfo } from "@/utils/achievement";
import { formatUnlockTime } from "@/utils/format";
import { useSteamAuth } from "@/context/SteamAuthContext";
import { SteamIcon } from "@/components/steam/SteamAuthButton";
import ManualSteamModal from "@/components/steam/ManualSteamModal";
import AchievementChecklistDrawer from "./AchievementChecklistDrawer";
import GuideCreatorModal from "@/components/guide/GuideCreatorModal";
import { listGameGuides, getCollectibleGuide } from "@/lib/api";
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
  Target,
  CheckSquare,
  Plus,
  Edit2,
  Code,
  FileCode,
  Loader2,
  MapPin,
  Map as MapIcon,
  Compass,
} from "lucide-react";

interface AchievementsListProps {
  achievements: Achievement[];
  steamAppId?: string;
  gameName?: string;
  gameId?: string;
  initialGuides?: GuideMeta[];
}

type FilterTab = "all" | "completed" | "todo" | "public" | "hidden";

interface SteamPlayerAchievementData {
  achieved: boolean;
  unlockTime: number;
}

export default function AchievementsList({
  achievements: rawAchievements,
  steamAppId,
  gameName = "Game",
  gameId = "3498",
  initialGuides = [],
}: AchievementsListProps) {
  const { user, login } = useSteamAuth();

  // Steam as exclusive source of truth when logged in with Steam or Steam App ID linked
  const achievements = useMemo(() => {
    let sourceList = rawAchievements;

    // If logged in with Steam or game has Steam counterpart, enforce Steam as sole source of truth
    if (steamAppId || user?.steamId) {
      const steamOnly = sourceList.filter((a) => Boolean(a.steamApiName));
      if (steamOnly.length > 0) {
        sourceList = steamOnly;
      }
    }

    const seenCanons = new Set<string>();
    const seenApis = new Set<string>();
    const seenIds = new Set<number>();
    const list: Achievement[] = [];

    for (const ach of sourceList) {
      if (!ach) continue;
      const clean = (ach.name || "").replace(/[ ​]/g, " ").replace(/\s+/g, " ").trim();
      const canon = clean.toLowerCase().replace(/[^a-z0-9]/g, "");
      const api = ach.steamApiName?.trim();

      if (canon && seenCanons.has(canon)) continue;
      if (api && seenApis.has(api)) continue;
      if (ach.id && seenIds.has(ach.id)) continue;

      if (canon) seenCanons.add(canon);
      if (api) seenApis.add(api);
      if (ach.id) seenIds.add(ach.id);
      list.push({ ...ach, name: clean });
    }

    return list;
  }, [rawAchievements, steamAppId, user?.steamId]);

  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [revealSpoilers, setRevealSpoilers] = useState(false);
  const [manualModalOpen, setManualModalOpen] = useState(false);

  // --- Guides & Checklists State ---
  const [guides, setGuides] = useState<GuideMeta[]>(initialGuides);
  const [checklistProgress, setChecklistProgress] = useState<Record<string | number, { completed: number; total: number }>>({});

  // Drawer & Modal States
  const [selectedAchievementForDrawer, setSelectedAchievementForDrawer] = useState<Achievement | null>(null);
  const [selectedGuideForDrawer, setSelectedGuideForDrawer] = useState<GuideMeta | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Guide Creator Modal State
  const [creatorModalOpen, setCreatorModalOpen] = useState(false);
  const [creatorAchievement, setCreatorAchievement] = useState<Achievement | null>(null);
  const [creatorGuide, setCreatorGuide] = useState<CollectibleGuide | null>(null);
  const [creatorTab, setCreatorTab] = useState<"general" | "builder" | "json">("general");

  // Automated AI Generation States (AI Pool Flash Lite)
  const [isAutoGenerating, setIsAutoGenerating] = useState(false);
  const [currentGeneratingName, setCurrentGeneratingName] = useState<string | null>(null);
  const [autoGenProgress, setAutoGenProgress] = useState<{ done: number; total: number } | null>(null);
  const autoGenStartedRef = useRef(false);



  // Fetch guides from API with safe merging
  const fetchGuides = useCallback(async () => {
    if (!gameId) return;
    const data = await listGameGuides(gameId);
    setGuides((prev) => {
      const map = new Map<string, GuideMeta>();
      for (const g of prev) if (g?.guideSlug) map.set(g.guideSlug, g);
      for (const g of data) if (g?.guideSlug) map.set(g.guideSlug, { ...map.get(g.guideSlug), ...g });
      return Array.from(map.values());
    });
  }, [gameId]);

  useEffect(() => {
    fetchGuides();
  }, [fetchGuides]);

  // Canonical string helper to strip non-alphanumeric characters and whitespace for fuzzy matching
  const toCanonical = (str: string = "") =>
    str.toLowerCase().replace(/checklist$/i, "").replace(/[^a-z0-9]/g, "");

  // Robust guide matching helper across ID, slug, Steam API name, and title
  const matchGuideForAchievement = useCallback((ach: Achievement, guideList: GuideMeta[]): GuideMeta | undefined => {
    if (!ach || !guideList || guideList.length === 0) return undefined;

    const achIdNum = Number(ach.id);
    const achIdStr = String(ach.id).trim();
    const achApi = ach.steamApiName?.trim().toLowerCase();
    const achCanon = toCanonical(ach.name);

    for (const guide of guideList) {
      if (!guide) continue;

      // 1. Direct achievementId match (number or string)
      if (guide.achievementId !== undefined && guide.achievementId !== null) {
        const gAchIdStr = String(guide.achievementId).trim();
        if (gAchIdStr === achIdStr || (!isNaN(achIdNum) && Number(guide.achievementId) === achIdNum)) {
          return guide;
        }
      }

      // 2. Multiple achievementIds array match
      if (guide.achievementIds && Array.isArray(guide.achievementIds)) {
        for (const rawId of guide.achievementIds) {
          const rawStr = String(rawId).trim();
          if (rawStr === achIdStr || (!isNaN(achIdNum) && Number(rawId) === achIdNum)) {
            return guide;
          }
        }
      }

      // 3. Slug match: ach-12345 or ach-STEAM_API_NAME
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

      // 4. Canonical title match (handles ellipses, em-dashes, hyphens, punctuation differences)
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
  }, []);

  // Map achievements to guides with multi-key indexing (id, string, number, steamApiName)
  const achievementGuideMap = useMemo(() => {
    const map = new Map<any, GuideMeta>();
    for (const ach of achievements) {
      const guide = matchGuideForAchievement(ach, guides);
      if (guide) {
        map.set(ach.id, guide);
        map.set(String(ach.id), guide);
        if (!isNaN(Number(ach.id))) {
          map.set(Number(ach.id), guide);
        }
        if (ach.steamApiName) {
          map.set(ach.steamApiName.toLowerCase(), guide);
        }
      }
    }
    return map;
  }, [achievements, guides, matchGuideForAchievement]);

  const getAttachedGuide = useCallback((ach: Achievement): GuideMeta | undefined => {
    return (
      achievementGuideMap.get(ach.id) ||
      achievementGuideMap.get(String(ach.id)) ||
      (!isNaN(Number(ach.id)) ? achievementGuideMap.get(Number(ach.id)) : undefined) ||
      (ach.steamApiName ? achievementGuideMap.get(ach.steamApiName.toLowerCase()) : undefined) ||
      matchGuideForAchievement(ach, guides)
    );
  }, [achievementGuideMap, guides, matchGuideForAchievement]);

  // Periodic background sync while there are achievements without guides
  useEffect(() => {
    const hasUnguided = achievements.some((ach) => !matchGuideForAchievement(ach, guides));
    if (!hasUnguided) return;

    // Fast-poll every 3.5 seconds to catch guides saved by seeder or auto-gen
    const interval = setInterval(() => {
      fetchGuides();
    }, 3500);

    const handleFocus = () => {
      fetchGuides();
    };
    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [achievements, guides, matchGuideForAchievement, fetchGuides]);

  const hasNoAchievements = achievements.length === 0;

  // Load progress for each guide from localStorage
  const refreshChecklistProgress = useCallback(() => {
    if (typeof window === "undefined" || !gameId) return;
    const nextProgress: Record<string | number, { completed: number; total: number }> = {};

    achievements.forEach((ach) => {
      const guideMeta = achievementGuideMap.get(ach.id) || getAttachedGuide(ach);
      if (guideMeta) {
        const storageKey = `100pg_guide_${gameId}_${guideMeta.guideSlug}`;
        try {
          const raw = localStorage.getItem(storageKey);
          if (raw) {
            const parsed = JSON.parse(raw);
            const completed = Object.values(parsed).filter(Boolean).length;
            nextProgress[ach.id] = { completed, total: guideMeta.totalCount };
            nextProgress[guideMeta.guideSlug] = { completed, total: guideMeta.totalCount };
          } else {
            nextProgress[ach.id] = { completed: 0, total: guideMeta.totalCount };
            nextProgress[guideMeta.guideSlug] = { completed: 0, total: guideMeta.totalCount };
          }
        } catch (e) {
          nextProgress[ach.id] = { completed: 0, total: guideMeta.totalCount };
          nextProgress[guideMeta.guideSlug] = { completed: 0, total: guideMeta.totalCount };
        }
      }
    });

    // Also populate progress for standalone guides
    guides.forEach((g) => {
      if (g && g.guideSlug && !nextProgress[g.guideSlug]) {
        const storageKey = `100pg_guide_${gameId}_${g.guideSlug}`;
        try {
          const raw = localStorage.getItem(storageKey);
          if (raw) {
            const parsed = JSON.parse(raw);
            const completed = Object.values(parsed).filter(Boolean).length;
            nextProgress[g.guideSlug] = { completed, total: g.totalCount || 1 };
          } else {
            nextProgress[g.guideSlug] = { completed: 0, total: g.totalCount || 1 };
          }
        } catch (e) {
          nextProgress[g.guideSlug] = { completed: 0, total: g.totalCount || 1 };
        }
      }
    });

    setChecklistProgress(nextProgress);
  }, [gameId, achievements, achievementGuideMap, guides, getAttachedGuide]);

  // Master roadmap generator for games with 0 achievements
  const generateMasterRoadmap = useCallback(async () => {
    setIsAutoGenerating(true);
    setCurrentGeneratingName("100% Completion Roadmap");
    setAutoGenProgress({ done: 0, total: 1 });

    try {
      const res = await fetch("/api/ai/generate-guide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId,
          gameTitle: gameName,
          achievementId: "100-percent-roadmap",
          achievementName: "100% Completion Roadmap",
          achievementDescription: "Comprehensive 100% completion guide covering storyline progression, collectible locations, secret milestones, and optional side objectives.",
        }),
      });
      if (res.ok) {
        const newGuideData = await res.json();
        const meta: GuideMeta = {
          gameId: String(gameId),
          guideSlug: newGuideData.guideSlug,
          title: newGuideData.title || "100% Completion Roadmap",
          subtitle: newGuideData.subtitle || "Step-by-step verified completion roadmap and milestones.",
          totalCount: newGuideData.totalCount || (newGuideData.regions?.reduce((acc: number, r: any) => acc + (r.items?.length || 0), 0) || 1),
          achievementId: "100-percent-roadmap",
          achievementIds: ["100-percent-roadmap"],
          hasMap: Boolean(newGuideData.maps?.length > 0 && newGuideData.maps[0]?.imageUrl),
          updatedAt: Date.now(),
        };
        setGuides((prev) => [...prev.filter((g) => g.guideSlug !== meta.guideSlug), meta]);
        try {
          const sessionKey = `100pg_autogen_${gameId}`;
          sessionStorage.setItem(sessionKey, JSON.stringify(["100-percent-roadmap"]));
        } catch (e) {}
      }
    } catch (e) {
      console.warn("[Auto-Gen Notice] Could not generate master roadmap:", e);
    } finally {
      setIsAutoGenerating(false);
      setCurrentGeneratingName(null);
      setAutoGenProgress(null);
      await fetchGuides();
      refreshChecklistProgress();
    }
  }, [gameId, gameName, fetchGuides, refreshChecklistProgress]);

  useEffect(() => {
    refreshChecklistProgress();
  }, [refreshChecklistProgress]);

  // Automatically start generating when user loads the page if any achievement lacks a guide
  useEffect(() => {
    if (autoGenStartedRef.current) return;

    autoGenStartedRef.current = true;

    const sessionKey = `100pg_autogen_${gameId}`;
    let sessionCompletedAchs: Set<string> = new Set();
    try {
      const saved = sessionStorage.getItem(sessionKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) sessionCompletedAchs = new Set(parsed);
      }
    } catch (e) {}

    const runAutoGenerator = async () => {
      // 1. Pre-fetch fresh guide list directly to ensure we have the latest guides from DynamoDB/Redis
      let currentGuides: GuideMeta[] = initialGuides;
      try {
        const fresh = await listGameGuides(gameId);
        if (fresh && fresh.length > 0) {
          currentGuides = fresh;
          setGuides((prev) => {
            const map = new Map<string, GuideMeta>();
            for (const g of prev) if (g?.guideSlug) map.set(g.guideSlug, g);
            for (const g of fresh) if (g?.guideSlug) map.set(g.guideSlug, { ...map.get(g.guideSlug), ...g });
            return Array.from(map.values());
          });
        }
      } catch (e) {
        console.warn("[Auto-Gen Notice] Could not pre-fetch fresh guides:", e);
      }

      // If game has no achievements, auto-generate master roadmap if no guides exist
      if (achievements.length === 0) {
        if (currentGuides.length === 0 && !sessionCompletedAchs.has("100-percent-roadmap")) {
          await generateMasterRoadmap();
        }
        return;
      }

      const unguided = achievements.filter((a) => {
        if (sessionCompletedAchs.has(String(a.id))) return false;
        return !matchGuideForAchievement(a, currentGuides);
      });

      if (unguided.length === 0) {
        setIsAutoGenerating(false);
        setCurrentGeneratingName(null);
        setAutoGenProgress(null);
        return;
      }

      const totalGameAchievements = achievements.length;
      const alreadyCompleted = totalGameAchievements - unguided.length;

      setIsAutoGenerating(true);
      setAutoGenProgress({ done: alreadyCompleted, total: totalGameAchievements });

      for (let i = 0; i < unguided.length; i++) {
        const targetAch = unguided[i];
        setCurrentGeneratingName(targetAch.name);
        setAutoGenProgress({ done: alreadyCompleted + i, total: totalGameAchievements });

        try {
          const res = await fetch("/api/ai/generate-guide", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              gameId,
              gameTitle: gameName,
              achievementId: targetAch.id,
              achievementName: targetAch.name,
              achievementDescription: targetAch.description,
            }),
          });
          if (res.ok) {
            const newGuideData = await res.json();
            const meta: GuideMeta = {
              gameId: String(gameId),
              guideSlug: newGuideData.guideSlug,
              title: newGuideData.title || `${targetAch.name} Checklist`,
              totalCount: newGuideData.totalCount || 1,
              achievementId: String(targetAch.id),
              achievementIds: [String(targetAch.id)],
              hasMap: Boolean(newGuideData.maps?.length > 0 && newGuideData.maps[0]?.imageUrl),
              updatedAt: Date.now(),
            };

            // Immediately flip this achievement card to show the checklist without waiting for all to finish!
            setGuides((prev) => [...prev.filter((g) => g.guideSlug !== meta.guideSlug), meta]);
            currentGuides = [...currentGuides.filter((g) => g.guideSlug !== meta.guideSlug), meta];

            // Record in session so refreshing doesn't restart
            sessionCompletedAchs.add(String(targetAch.id));
            try {
              sessionStorage.setItem(sessionKey, JSON.stringify(Array.from(sessionCompletedAchs)));
            } catch (e) {}
          }
          refreshChecklistProgress();
        } catch (e) {
          console.warn("[Auto-Gen Notice]", targetAch.name, e);
        }

        // Multi-Model Pool safe delay (1.5 seconds across rotating model quotas)
        if (i < unguided.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }
      }

      setIsAutoGenerating(false);
      setCurrentGeneratingName(null);
      setAutoGenProgress(null);

      // Final sync with backend to get any guides generated by background seeder in the meantime
      await fetchGuides();
    };

    runAutoGenerator();
  }, [achievements, gameId, gameName, fetchGuides, refreshChecklistProgress, initialGuides, matchGuideForAchievement]);

  // Open Drawer to view standalone guide (when there are no achievements or from guide card)
  const handleOpenGuideDrawer = (guide: GuideMeta) => {
    setSelectedAchievementForDrawer(null);
    setSelectedGuideForDrawer(guide);
    setIsDrawerOpen(true);
  };

  // Open Creator to edit an existing guide
  const handleEditGuide = async (guideMeta: GuideMeta) => {
    const guideData = await getCollectibleGuide(gameId, guideMeta.guideSlug);
    setCreatorAchievement(null);
    setCreatorGuide(guideData);
    setCreatorTab("builder");
    setCreatorModalOpen(true);
  };

  // Open Creator to create a new guide
  const handleCreateNewGuide = () => {
    setCreatorAchievement(null);
    setCreatorGuide(null);
    setCreatorTab("general");
    setCreatorModalOpen(true);
  };

  // Synchronize drawer guide whenever guides list updates
  useEffect(() => {
    if (isDrawerOpen && selectedAchievementForDrawer) {
      const updatedGuide =
        matchGuideForAchievement(selectedAchievementForDrawer, guides) ||
        getAttachedGuide(selectedAchievementForDrawer);
      if (updatedGuide && updatedGuide.guideSlug !== selectedGuideForDrawer?.guideSlug) {
        setSelectedGuideForDrawer(updatedGuide);
      }
    }
  }, [guides, isDrawerOpen, selectedAchievementForDrawer, matchGuideForAchievement, getAttachedGuide, selectedGuideForDrawer]);

  const handleDrawerGuideCreated = useCallback((newGuide: CollectibleGuide) => {
    if (!newGuide || !newGuide.guideSlug) return;
    const meta: GuideMeta = {
      gameId: String(gameId),
      guideSlug: newGuide.guideSlug,
      title: newGuide.title,
      subtitle: newGuide.subtitle,
      totalCount: newGuide.totalCount,
      achievementId: String(newGuide.achievementId || ""),
      achievementIds: [String(newGuide.achievementId || "")],
      hasMap: Boolean(newGuide.maps && newGuide.maps.length > 0 && newGuide.maps[0]?.imageUrl),
      updatedAt: Date.now(),
    };
    setGuides((prev) => {
      if (prev.some((g) => g.guideSlug === meta.guideSlug)) return prev;
      return [...prev, meta];
    });
  }, [gameId]);

  const handleChecklistProgressChange = useCallback((achId: number, completedCount: number, totalCount: number) => {
    setChecklistProgress((prev) => {
      const existing = prev[achId];
      if (existing && existing.completed === completedCount && existing.total === totalCount) {
        return prev;
      }
      return {
        ...prev,
        [achId]: { completed: completedCount, total: totalCount },
      };
    });
  }, []);

  // Open Drawer to view checklist
  const handleOpenDrawer = (ach: Achievement) => {
    const guideMeta =
      achievementGuideMap.get(ach.id) ||
      getAttachedGuide(ach) ||
      matchGuideForAchievement(ach, guides) ||
      null;
    setSelectedAchievementForDrawer(ach);
    setSelectedGuideForDrawer(guideMeta);
    setIsDrawerOpen(true);
  };

  // Open Creator to add a new checklist
  const handleAddChecklist = (ach: Achievement) => {
    setCreatorAchievement(ach);
    setCreatorGuide(null);
    setCreatorTab("general");
    setCreatorModalOpen(true);
  };

  // Open Creator to edit an existing checklist
  const handleEditChecklist = async (ach: Achievement, guideMeta: GuideMeta) => {
    const guideData = await getCollectibleGuide(gameId, guideMeta.guideSlug);
    setCreatorAchievement(ach);
    setCreatorGuide(guideData);
    setCreatorTab("builder");
    setCreatorModalOpen(true);
  };

  // Open Creator in JSON Import Mode
  const handleOpenJsonImport = () => {
    setCreatorAchievement(null);
    setCreatorGuide(null);
    setCreatorTab("json");
    setCreatorModalOpen(true);
  };

  // --- Steam Sync State ---
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
      } catch (e) {}
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
        if (ach.steamApiName) {
          const steamStatus = steamUnlockedMap.get(ach.steamApiName.toLowerCase());
          if (steamStatus?.achieved) {
            return { isCompleted: true, unlockTime: steamStatus.unlockTime, fromSteam: true };
          }
        }

        const nameKey = ach.name.trim().toLowerCase();
        const steamNameStatus = steamUnlockedMap.get(nameKey);
        if (steamNameStatus?.achieved) {
          return { isCompleted: true, unlockTime: steamNameStatus.unlockTime, fromSteam: true };
        }
      }

      // When logged in with Steam, Steam is the EXCLUSIVE source of truth (do not allow local checks to alter Steam stats)
      if (user?.steamId) {
        return { isCompleted: false, unlockTime: 0, fromSteam: false };
      }

      // 2. Offline / Guest manual toggle fallback (only for non-logged-in users)
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
      {/* Steam Sync Progress Bar & Login Banner (Only when game has official achievements) */}
      {steamAppId && !hasNoAchievements && (
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

      {/* Notice Banner when game has No Official Achievements */}
      {hasNoAchievements && (
        <div className="bg-zinc-950/90 border border-zinc-800 rounded-2xl p-5 shadow-2xl backdrop-blur-md relative overflow-hidden">
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center shrink-0 text-orange-400 shadow-md">
                <Compass className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white font-outfit">
                    No Official Steam Achievements Detected
                  </h3>
                  <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    100% Roadmap Mode
                  </span>
                </div>
                <p className="text-xs text-zinc-400 max-w-xl leading-relaxed mt-1">
                  This title does not have an official Steam achievement list (e.g. DRM-free, Nintendo, retro, or custom platform). You can follow verified 100% completion guides, track milestones, and view interactive maps below.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <button
                onClick={handleCreateNewGuide}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-orange-400 hover:text-orange-300 text-xs font-semibold transition-all shadow-sm"
              >
                <Plus size={14} />
                <span>Add Custom Checklist</span>
              </button>
              <button
                onClick={handleOpenJsonImport}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-semibold transition-all"
              >
                <FileCode size={14} />
                <span>Import JSON</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header and Controls */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-3xl font-bold font-outfit text-white flex items-center gap-3">
            <span className="w-2.5 h-7 rounded-full bg-gradient-to-b from-orange-500 to-yellow-400 inline-block shadow-[0_0_12px_rgba(249,115,22,0.8)]"></span>
            {hasNoAchievements ? (
              <>100% Completion Roadmaps & Guides ({guides.length})</>
            ) : (
              <>Achievements & Checklists ({achievements.length})</>
            )}
          </h2>

          {/* Live Automatic AI Status Indicator (No manual buttons) */}
          {isAutoGenerating && autoGenProgress && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-orange-500/10 border border-orange-500/30 text-xs font-mono text-orange-400 animate-pulse">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-400" />
              <span>Generating checklists ({autoGenProgress.done + 1}/{autoGenProgress.total})... Please wait</span>
            </div>
          )}
        </div>

        {/* Automatic AI Seeding Status Banner */}
        {isAutoGenerating && autoGenProgress && currentGeneratingName && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-transparent border border-orange-500/30 flex items-center justify-between gap-4 animate-in fade-in duration-200">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-orange-400 animate-spin" style={{ animationDuration: "3s" }} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-outfit font-bold text-white text-sm">
                    Auto-Generating Verified Checklists
                  </h4>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-orange-500/20 text-orange-300 border border-orange-500/30">
                    Multi-Model Pool (AI Pool & 3.1) &bull; ~45 RPM Throughput
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5 truncate">
                  Generating verified checklist for: <strong className="text-white">&ldquo;{currentGeneratingName}&rdquo;</strong> ({autoGenProgress.done + 1} of {autoGenProgress.total})... Please wait.
                </p>
              </div>
            </div>
          </div>
        )}

      </div>

      {hasNoAchievements ? (
        /* Roadmaps Grid / Empty State for Games with 0 Achievements */
        <div className="space-y-4">
          {guides.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {guides.map((guide) => {
                const progress = checklistProgress[guide.guideSlug] || { completed: 0, total: guide.totalCount || 1 };
                const isCompleted = progress.total > 0 && progress.completed >= progress.total;

                return (
                  <div
                    key={guide.guideSlug}
                    className={`flex flex-col justify-between p-5 rounded-2xl transition-all group relative overflow-hidden border ${
                      isCompleted
                        ? "border-emerald-500/40 bg-gradient-to-r from-emerald-950/20 via-zinc-950 to-black hover:border-emerald-400/70 shadow-[0_0_25px_rgba(16,185,129,0.1)]"
                        : "border-zinc-900 bg-zinc-950/90 hover:border-orange-500/50 hover:shadow-[0_0_25px_rgba(249,115,22,0.12)]"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${
                            isCompleted
                              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                              : "bg-orange-500/10 border-orange-500/30 text-orange-400"
                          }`}
                        >
                          {isCompleted ? <CheckCircle2 size={24} /> : <Compass size={24} />}
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-outfit font-bold text-lg text-white group-hover:text-amber-300 transition-colors">
                              {guide.title}
                            </h3>
                            {guide.hasMap && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-blue-500/15 text-blue-300 border border-blue-500/30">
                                <MapPin size={10} />
                                Interactive Map
                              </span>
                            )}
                            {isCompleted && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                <Check size={10} />
                                100% Completed
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-zinc-400 leading-relaxed max-w-xl">
                            {guide.subtitle || "Step-by-step verified completion roadmap and milestones."}
                          </p>

                          {/* Progress Counter & Bar */}
                          <div className="flex items-center gap-3 pt-2">
                            <span className="text-xs font-mono text-zinc-400">
                              <strong className="text-white">{progress.completed}</strong> of <strong className="text-white">{guide.totalCount}</strong> Steps
                            </span>
                            <div className="w-32 h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all duration-300 ${
                                  isCompleted ? "bg-emerald-500" : "bg-gradient-to-r from-orange-500 to-amber-400"
                                }`}
                                style={{
                                  width: `${Math.min(100, Math.round(((progress.completed || 0) / (guide.totalCount || 1)) * 100))}%`,
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                        <button
                          onClick={() => handleOpenGuideDrawer(guide)}
                          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-black text-xs font-bold shadow-lg shadow-orange-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                          {guide.hasMap ? <MapIcon size={14} /> : <CheckSquare size={14} />}
                          <span>{guide.hasMap ? "View Checklist & Map" : "View Checklist"}</span>
                        </button>

                        <button
                          onClick={() => handleEditGuide(guide)}
                          className="p-2.5 rounded-xl text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 transition-colors"
                          title="Edit Checklist"
                        >
                          <Edit2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : isAutoGenerating ? (
            <div className="p-10 rounded-2xl bg-zinc-950/80 border border-orange-500/30 text-center flex flex-col items-center justify-center gap-3 shadow-xl">
              <div className="w-14 h-14 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
                <Loader2 size={28} className="animate-spin text-orange-400" />
              </div>
              <h3 className="text-lg font-bold text-white font-outfit">
                Generating 100% Completion Roadmap
              </h3>
              <p className="text-xs text-zinc-400 max-w-md leading-relaxed">
                Researching authenticated storyline quests, collectibles, and 100% milestones with Gemini Multi-Model Pool... Please wait.
              </p>
            </div>
          ) : (
            <div className="p-10 rounded-2xl bg-zinc-950/80 border border-zinc-900 text-center flex flex-col items-center justify-center gap-4 shadow-xl">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-md">
                <Trophy size={28} />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white font-outfit">
                  No 100% Completion Roadmaps Yet
                </h3>
                <p className="text-xs text-zinc-400 max-w-md leading-relaxed">
                  This title does not have official achievements. Generate a verified 100% roadmap covering all storyline quests, collectibles, and secret milestones or create your own custom checklist.
                </p>
              </div>
              <div className="flex items-center gap-3 pt-2 flex-wrap justify-center">
                <button
                  onClick={generateMasterRoadmap}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-black text-xs font-bold shadow-lg shadow-orange-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Sparkles size={14} />
                  <span>Generate 100% Completion Roadmap</span>
                </button>
                <button
                  onClick={handleCreateNewGuide}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-semibold transition-all"
                >
                  <Plus size={14} />
                  <span>Add Custom Checklist</span>
                </button>
                <button
                  onClick={handleOpenJsonImport}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-semibold transition-all"
                >
                  <FileCode size={14} />
                  <span>Import JSON</span>
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
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

      {/* Grid of Achievements with Checklist Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
        {filteredAchievements.length > 0 ? (
          filteredAchievements.map((ach) => {
            const tierInfo = getAchievementTierInfo(ach.percent);
            const { isCompleted, unlockTime } = getAchievementStatus(ach);
            const isMasked = ach.hidden && !revealSpoilers && !isCompleted;
            const attachedGuide = achievementGuideMap.get(ach.id) || getAttachedGuide(ach);
            const progress = checklistProgress[ach.id];

            return (
              <div
                key={ach.id}
                className={`flex flex-col justify-between p-4 rounded-xl transition-all group relative overflow-hidden border ${
                  isCompleted
                    ? "border-emerald-500/40 bg-gradient-to-r from-emerald-950/20 via-zinc-950 to-black hover:border-emerald-400/70 hover:shadow-[0_0_25px_rgba(16,185,129,0.15)]"
                    : ach.hidden
                    ? "border-amber-500/30 bg-gradient-to-r from-amber-500/[0.04] to-black hover:border-amber-400/60 hover:shadow-[0_0_25px_rgba(245,158,11,0.14)]"
                    : "border-zinc-900 bg-black hover:border-orange-500/50 hover:shadow-[0_0_25px_rgba(249,115,22,0.12)]"
                }`}
              >
                <div>
                  <div className="flex gap-4">
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
                      <div className="relative shrink-0">
                        {ach.image ? (
                          <img
                            src={ach.image}
                            alt={ach.name}
                            className={`w-10 h-10 rounded-lg object-cover shadow-md group-hover:scale-105 transition-transform border shrink-0 ${
                              isCompleted
                                ? "border-emerald-500/50"
                                : "border-zinc-900"
                            } ${isMasked ? "blur-md opacity-40" : ""}`}
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-zinc-950 border border-zinc-900 shrink-0 flex items-center justify-center">
                            <Trophy className="w-4 h-4 text-zinc-700" />
                          </div>
                        )}

                        {ach.hidden && !isCompleted && (
                          <div className="absolute -top-1 -left-1 bg-amber-500 text-black rounded-full p-0.5 shadow-md">
                            <EyeOff className="w-2.5 h-2.5" />
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
                </div>

                {/* Bottom Bar: Checklist Action Button */}
                <div className="mt-3 pt-3 border-t border-zinc-900/80 flex items-center justify-between gap-3">
                  {attachedGuide ? (
                    /* Has Checklist */
                    <div className="flex items-center justify-between w-full gap-2">
                      <button
                        onClick={() => handleOpenDrawer(ach)}
                        className="flex-1 flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-orange-400 hover:text-orange-300 transition-all text-xs font-semibold group/btn"
                      >
                        <div className="flex items-center gap-2">
                          <CheckSquare className="w-4 h-4 text-orange-400 group-hover/btn:scale-110 transition-transform" />
                          <span>{attachedGuide.hasMap ? "View Checklist & Map" : "View Checklist"}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono font-bold text-amber-300">
                            {progress?.completed || 0} / {attachedGuide.totalCount} Steps
                          </span>
                        </div>
                      </button>

                      <button
                        onClick={() => handleEditChecklist(ach, attachedGuide)}
                        className="p-1.5 rounded-xl text-zinc-500 hover:text-white bg-zinc-950 border border-zinc-900 hover:border-zinc-800 transition-colors"
                        title="Edit Checklist"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    /* No Checklist Yet - Automated Generation Loading State (No buttons) */
                    <div 
                      onClick={() => handleOpenDrawer(ach)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-orange-500/5 border border-orange-500/20 text-orange-400 cursor-pointer hover:bg-orange-500/10 transition-colors group/load"
                      title="Generating with AI Pool Flash Lite. Click to view live progress."
                    >
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-400 shrink-0" />
                        <span className="text-xs font-mono font-medium">
                          Generating checklist... Please wait
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider group-hover/load:text-zinc-400">
                        AI Pool
                      </span>
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
        </>
      )}

      {/* Slide-over Drawer for Achievement Checklist & Map */}
      <AchievementChecklistDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        achievement={selectedAchievementForDrawer}
        gameId={gameId}
        gameName={gameName}
        guideMeta={selectedGuideForDrawer}
        onOpenCreator={(ach, existingGuide) => {
          setIsDrawerOpen(false);
          setCreatorAchievement(ach);
          setCreatorGuide(existingGuide || null);
          setCreatorTab(existingGuide ? "builder" : "general");
          setCreatorModalOpen(true);
        }}
        onGuideDeleted={() => {
          fetchGuides();
          refreshChecklistProgress();
        }}
        onGuideCreated={handleDrawerGuideCreated}
        onChecklistProgressChange={handleChecklistProgressChange}
      />

      {/* Guide Creator Modal */}
      <GuideCreatorModal
        gameId={gameId}
        availableAchievements={achievements}
        initialAchievement={creatorAchievement}
        initialGuide={creatorGuide}
        initialTab={creatorTab}
        isOpen={creatorModalOpen}
        onClose={() => {
          setCreatorModalOpen(false);
          setCreatorAchievement(null);
          setCreatorGuide(null);
        }}
        onGuideCreated={() => {
          fetchGuides();
          refreshChecklistProgress();
        }}
      />

      {/* Manual Steam Connection Modal */}
      <ManualSteamModal
        isOpen={manualModalOpen}
        onClose={() => setManualModalOpen(false)}
      />
    </div>
  );
}
