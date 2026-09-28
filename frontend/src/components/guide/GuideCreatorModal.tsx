"use client";

import React, { useState, useRef, useMemo, useEffect } from "react";
import { CollectibleGuide, CollectibleStepItem, GuideMap, AttachedAchievement, Achievement } from "@/types";
import { saveCollectibleGuide } from "@/lib/api";
import {
  Plus,
  X,
  Save,
  Code,
  Compass,
  MapPin,
  Trophy,
  Layers,
  Image as ImageIcon,
  Upload,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Search,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sparkles,
  ChevronRight,
  Eye,
} from "lucide-react";

interface GuideCreatorModalProps {
  gameId: string;
  gameSlug?: string;
  availableAchievements?: Achievement[];
  isOpen: boolean;
  onClose: () => void;
  onGuideCreated?: () => void;
}

type CreatorTab = "general" | "builder" | "json";

export default function GuideCreatorModal({
  gameId,
  gameSlug = "game",
  availableAchievements = [],
  isOpen,
  onClose,
  onGuideCreated,
}: GuideCreatorModalProps) {
  const [activeTab, setActiveTab] = useState<CreatorTab>("general");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // --- 1. General Info & Achievements ---
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [attachedAchievements, setAttachedAchievements] = useState<AttachedAchievement[]>([]);
  const [achievementSearch, setAchievementSearch] = useState("");

  // Auto-slugify title
  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!slug || slug === title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")) {
      setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""));
    }
  };

  // --- 2. Multiple Maps Management ---
  const [maps, setMaps] = useState<GuideMap[]>([
    { id: "map-1", name: "Main Map", imageUrl: "" },
  ]);
  const [activeMapId, setActiveMapId] = useState<string>("map-1");

  const activeMap = useMemo(() => {
    return maps.find((m) => m.id === activeMapId) || maps[0];
  }, [maps, activeMapId]);

  const handleAddMap = () => {
    const nextNum = maps.length + 1;
    const newMap: GuideMap = {
      id: `map-${Date.now()}`,
      name: `Map ${nextNum} (Area ${nextNum})`,
      imageUrl: "",
    };
    setMaps((prev) => [...prev, newMap]);
    setActiveMapId(newMap.id);
  };

  const handleUpdateActiveMap = (field: keyof GuideMap, value: string) => {
    setMaps((prev) =>
      prev.map((m) => (m.id === activeMapId ? { ...m, [field]: value } : m))
    );
  };

  const handleRemoveMap = (mapId: string) => {
    if (maps.length <= 1) {
      alert("A guide must have at least one map.");
      return;
    }
    setMaps((prev) => prev.filter((m) => m.id !== mapId));
    if (activeMapId === mapId) {
      setActiveMapId(maps[0].id);
    }
  };

  // --- 3. Step-by-Step Checklist Maker & Pins ---
  const [steps, setSteps] = useState<CollectibleStepItem[]>([]);
  const [editingStepId, setEditingStepId] = useState<number | null>(null);

  // Active step form fields
  const [stepNum, setStepNum] = useState<number>(1);
  const [stepRegion, setStepRegion] = useState("");
  const [stepLocation, setStepLocation] = useState("");
  const [stepDetails, setStepDetails] = useState("");
  const [stepX, setStepX] = useState<number>(50.0);
  const [stepY, setStepY] = useState<number>(50.0);
  const [stepImageUrl, setStepImageUrl] = useState("");

  // Map canvas dragging / interaction state
  const mapCanvasRef = useRef<HTMLDivElement>(null);
  const [isDraggingPin, setIsDraggingPin] = useState(false);
  const [canvasZoom, setCanvasZoom] = useState(1);

  // Filter steps on current active map
  const activeMapSteps = useMemo(() => {
    return steps.filter((s) => !s.mapId || s.mapId === activeMapId);
  }, [steps, activeMapId]);

  // Click or drag on map canvas to set pin coordinates (0 - 100%)
  const calculateCoordinates = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!mapCanvasRef.current) return null;
    const rect = mapCanvasRef.current.getBoundingClientRect();
    const rawX = ((e.clientX - rect.left) / rect.width) * 100;
    const rawY = ((e.clientY - rect.top) / rect.height) * 100;
    const clampedX = Math.round(Math.max(1, Math.min(99, rawX)) * 10) / 10;
    const clampedY = Math.round(Math.max(1, Math.min(99, rawY)) * 10) / 10;
    return { x: clampedX, y: clampedY };
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const coords = calculateCoordinates(e);
    if (coords) {
      setStepX(coords.x);
      setStepY(coords.y);
      setIsDraggingPin(true);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingPin) return;
    const coords = calculateCoordinates(e);
    if (coords) {
      setStepX(coords.x);
      setStepY(coords.y);
    }
  };

  const handleCanvasMouseUp = () => {
    setIsDraggingPin(false);
  };

  // Add or update step
  const handleSaveStep = () => {
    if (!stepLocation.trim()) {
      alert("Please provide a location description for this step.");
      return;
    }

    const item: CollectibleStepItem = {
      id: stepNum,
      name: `Step #${stepNum}`,
      region: stepRegion.trim() || "General Area",
      locationText: stepLocation.trim(),
      details: stepDetails.trim() || undefined,
      imageUrl: stepImageUrl.trim() || undefined,
      mapId: activeMapId,
      x: stepX,
      y: stepY,
    };

    if (editingStepId !== null) {
      // Update existing step
      setSteps((prev) => prev.map((s) => (s.id === editingStepId ? item : s)));
      setEditingStepId(null);
    } else {
      // Add new step
      setSteps((prev) => [...prev, item].sort((a, b) => a.id - b.id));
    }

    // Prepare next step
    const nextId = Math.max(...steps.map((s) => s.id), stepNum) + 1;
    setStepNum(nextId);
    setStepLocation("");
    setStepDetails("");
    setStepImageUrl("");
    // Keep region and jitter pin slightly
    setStepX((prev) => Math.min(95, Math.max(5, Math.round((prev + 3.5) * 10) / 10)));
    setStepY((prev) => Math.min(95, Math.max(5, Math.round((prev + 2.0) * 10) / 10)));
  };

  const handleEditStep = (item: CollectibleStepItem) => {
    setEditingStepId(item.id);
    setStepNum(item.id);
    setStepRegion(item.region);
    setStepLocation(item.locationText);
    setStepDetails(item.details || "");
    setStepX(item.x);
    setStepY(item.y);
    setStepImageUrl(item.imageUrl || "");
    if (item.mapId && item.mapId !== activeMapId) {
      setActiveMapId(item.mapId);
    }
  };

  const handleDeleteStep = (id: number) => {
    setSteps((prev) => prev.filter((s) => s.id !== id));
    if (editingStepId === id) {
      setEditingStepId(null);
    }
  };

  // --- 4. Raw JSON Mode Sync ---
  const [jsonText, setJsonText] = useState("");

  const buildGuidePayload = (): CollectibleGuide => {
    // Group steps by region
    const regionMap: Record<string, CollectibleStepItem[]> = {};
    steps.forEach((s) => {
      const reg = s.region || "General Area";
      if (!regionMap[reg]) regionMap[reg] = [];
      regionMap[reg].push(s);
    });

    const regions = Object.entries(regionMap).map(([regName, items]) => ({
      id: regName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      name: regName,
      itemCount: items.length,
      items: items,
    }));

    return {
      gameId,
      gameSlug,
      guideSlug: slug || "custom-guide",
      title: title || "Custom 100% Collectible Guide",
      subtitle: subtitle || "Interactive map and step-by-step checklist.",
      totalCount: steps.length,
      requiredForCompletion: steps.length,
      mapImageUrl: maps[0]?.imageUrl || undefined,
      maps: maps,
      relatedAchievements: attachedAchievements,
      regions: regions,
    };
  };

  // Sync to JSON when switching to JSON tab
  const handleTabChange = (tab: CreatorTab) => {
    if (tab === "json") {
      setJsonText(JSON.stringify(buildGuidePayload(), null, 2));
    } else if (activeTab === "json") {
      // Parse back from JSON if modified
      try {
        const parsed = JSON.parse(jsonText);
        if (parsed.title) setTitle(parsed.title);
        if (parsed.guideSlug) setSlug(parsed.guideSlug);
        if (parsed.subtitle) setSubtitle(parsed.subtitle);
        if (parsed.maps && Array.isArray(parsed.maps)) setMaps(parsed.maps);
        if (parsed.relatedAchievements && Array.isArray(parsed.relatedAchievements)) {
          setAttachedAchievements(parsed.relatedAchievements);
        }
        if (parsed.regions && Array.isArray(parsed.regions)) {
          const flatItems = parsed.regions.flatMap((r: any) => r.items || []);
          setSteps(flatItems);
        }
      } catch (e) {
        console.warn("Could not parse JSON back into form:", e);
      }
    }
    setActiveTab(tab);
  };

  // --- 5. Save Guide to DynamoDB ---
  const handleSaveToDynamoDb = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    let payload: CollectibleGuide;
    if (activeTab === "json") {
      try {
        payload = JSON.parse(jsonText);
      } catch (e) {
        setIsSubmitting(false);
        setErrorMessage("Invalid JSON payload. Please fix syntax errors.");
        return;
      }
    } else {
      if (!title.trim()) {
        setIsSubmitting(false);
        setErrorMessage("Guide Title is required.");
        return;
      }
      if (!slug.trim()) {
        setIsSubmitting(false);
        setErrorMessage("URL Slug is required.");
        return;
      }
      if (steps.length === 0) {
        setIsSubmitting(false);
        setErrorMessage("Please add at least 1 step item to the guide.");
        return;
      }
      payload = buildGuidePayload();
    }

    const res = await saveCollectibleGuide(gameId, payload);
    setIsSubmitting(false);

    if (res.success) {
      setSuccessMessage("Guide successfully saved to DynamoDB!");
      if (onGuideCreated) onGuideCreated();
      setTimeout(() => {
        onClose();
      }, 1200);
    } else {
      setErrorMessage(res.message || "Failed to save guide to DynamoDB.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-6xl bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-black/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400">
              <Compass size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold font-outfit text-white">Create New 100% Guide</h2>
              <p className="text-xs text-zinc-400">Interactive Map, Drag-and-Drop Pinning & DynamoDB Persistence</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tabs */}
            <div className="flex items-center bg-black p-1 rounded-xl border border-zinc-800">
              <button
                type="button"
                onClick={() => handleTabChange("general")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === "general"
                    ? "bg-gradient-to-r from-orange-500 to-amber-500 text-black shadow-md"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                1. Info & Achievements
              </button>
              <button
                type="button"
                onClick={() => handleTabChange("builder")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  activeTab === "builder"
                    ? "bg-gradient-to-r from-orange-500 to-amber-500 text-black shadow-md"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <MapPin size={13} />
                <span>2. Maps & Pin Checklist ({steps.length})</span>
              </button>
              <button
                type="button"
                onClick={() => handleTabChange("json")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  activeTab === "json"
                    ? "bg-gradient-to-r from-orange-500 to-amber-500 text-black shadow-md"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Code size={13} />
                <span>Raw JSON</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-xl transition-colors ml-2"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-6">
          {/* Notifications */}
          {errorMessage && (
            <div className="flex items-center gap-2 p-3 bg-red-950/60 border border-red-500/40 rounded-xl text-red-200 text-xs">
              <AlertCircle size={16} className="text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="flex items-center gap-2 p-3 bg-green-950/60 border border-green-500/40 rounded-xl text-green-200 text-xs">
              <CheckCircle2 size={16} className="text-green-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* TAB 1: General Info & Completable Achievements */}
          {activeTab === "general" && (
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Guide Title *</label>
                  <input
                    type="text"
                    placeholder="e.g. All 50 Spaceship Parts"
                    value={title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-black border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500/50 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">URL Slug *</label>
                  <input
                    type="text"
                    placeholder="e.g. spaceship-parts"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-black border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500/50 font-mono text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Subtitle / Overview Description</label>
                <input
                  type="text"
                  placeholder="e.g. Collect all 50 alien ship fragments across San Andreas to unlock the Space Docker vehicle."
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-black border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500/50 text-sm"
                />
              </div>

              {/* Attach Completable Achievements Section */}
              <div className="p-5 bg-black border border-zinc-900 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Trophy size={18} className="text-amber-400" />
                    <div>
                      <h3 className="text-sm font-bold text-white">Attach Completable Achievements</h3>
                      <p className="text-xs text-zinc-400">Select which achievements this guide helps the user complete.</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono text-amber-400 font-semibold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    {attachedAchievements.length} Attached
                  </span>
                </div>

                {/* Attached Chips */}
                {attachedAchievements.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {attachedAchievements.map((ach) => (
                      <div
                        key={ach.id}
                        className="flex items-center gap-2 px-3 py-1.5 bg-zinc-950 border border-amber-500/40 rounded-xl text-xs text-white"
                      >
                        {ach.image && (
                          <img src={ach.image} alt={ach.name} className="w-5 h-5 rounded object-cover" />
                        )}
                        <span className="font-semibold">{ach.name}</span>
                        <button
                          type="button"
                          onClick={() => setAttachedAchievements((prev) => prev.filter((a) => a.id !== ach.id))}
                          className="text-zinc-400 hover:text-red-400 ml-1 transition-colors"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Achievement Search Filter */}
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Search game achievements to attach..."
                    value={achievementSearch}
                    onChange={(e) => setAchievementSearch(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50"
                  />
                </div>

                {/* Achievements List */}
                <div className="max-h-48 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                  {availableAchievements
                    .filter((a) =>
                      achievementSearch.trim()
                        ? a.name.toLowerCase().includes(achievementSearch.toLowerCase()) ||
                          a.description.toLowerCase().includes(achievementSearch.toLowerCase())
                        : true
                    )
                    .map((ach) => {
                      const isAttached = attachedAchievements.some((a) => a.id === ach.id);
                      return (
                        <div
                          key={ach.id}
                          onClick={() => {
                            if (isAttached) {
                              setAttachedAchievements((prev) => prev.filter((a) => a.id !== ach.id));
                            } else {
                              setAttachedAchievements((prev) => [
                                ...prev,
                                {
                                  id: ach.id,
                                  name: ach.name,
                                  image: ach.image,
                                  percent: ach.percent,
                                  hidden: ach.hidden,
                                  description: ach.description,
                                },
                              ]);
                            }
                          }}
                          className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                            isAttached
                              ? "bg-amber-500/10 border-amber-500/50 shadow-md"
                              : "bg-zinc-950 border-zinc-850 hover:border-zinc-700"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            {ach.image ? (
                              <img src={ach.image} alt={ach.name} className="w-8 h-8 rounded-lg object-cover border border-zinc-800 shrink-0" />
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                                <Trophy size={14} className="text-zinc-600" />
                              </div>
                            )}
                            <div className="truncate">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-xs text-white truncate">{ach.name}</span>
                                {ach.hidden && (
                                  <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1 py-0.2 rounded font-semibold uppercase">
                                    Secret
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-zinc-400 truncate">{ach.description}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 ml-3">
                            {ach.percent && (
                              <span className="text-[10px] font-mono text-zinc-500">{ach.percent}%</span>
                            )}
                            <input
                              type="checkbox"
                              checked={isAttached}
                              readOnly
                              className="w-4 h-4 rounded accent-orange-500 pointer-events-none"
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Navigation button */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => handleTabChange("builder")}
                  className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-black font-bold text-xs rounded-xl shadow-lg flex items-center gap-1.5 hover:from-orange-600 hover:to-amber-600 transition-all"
                >
                  <span>Next: Import Maps & Drag-and-Drop Pins</span>
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: Maps Manager, Drag-and-Drop Pinning & Step Checklist */}
          {activeTab === "builder" && (
            <div className="space-y-6">
              {/* Multi-Map Management Bar */}
              <div className="p-4 bg-black border border-zinc-900 rounded-2xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Layers size={18} className="text-orange-400" />
                    <div>
                      <h3 className="text-sm font-bold text-white">Maps ({maps.length})</h3>
                      <p className="text-xs text-zinc-400">Some games have multiple maps or levels (e.g. Surface, Subway, Interior).</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddMap}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-orange-400 border border-orange-500/20 flex items-center gap-1.5 transition-colors self-start sm:self-auto"
                  >
                    <Plus size={14} />
                    <span>Add Another Map</span>
                  </button>
                </div>

                {/* Map Tabs */}
                <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1">
                  {maps.map((m) => {
                    const isActive = m.id === activeMapId;
                    const mapStepCount = steps.filter((s) => s.mapId === m.id).length;
                    return (
                      <div
                        key={m.id}
                        onClick={() => setActiveMapId(m.id)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl cursor-pointer text-xs font-semibold transition-all border ${
                          isActive
                            ? "bg-gradient-to-r from-orange-500 to-amber-500 text-black border-transparent shadow-md"
                            : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white"
                        }`}
                      >
                        <span>{m.name}</span>
                        <span className={`text-[10px] font-mono px-1 rounded-full ${isActive ? "bg-black/30 text-black" : "bg-zinc-800 text-zinc-400"}`}>
                          {mapStepCount} pins
                        </span>
                        {maps.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveMap(m.id);
                            }}
                            className={`p-0.5 rounded hover:bg-red-500/20 hover:text-red-400 ${isActive ? "text-black/60" : "text-zinc-600"}`}
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Active Map Configuration (Image URL / Upload) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-zinc-900">
                  <div>
                    <label className="block text-[11px] text-zinc-400 mb-1">Active Map Name</label>
                    <input
                      type="text"
                      value={activeMap.name}
                      onChange={(e) => handleUpdateActiveMap("name", e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-zinc-400 mb-1 flex items-center justify-between">
                      <span>Import Map Image URL</span>
                      <span className="text-[10px] text-zinc-500">Paste URL or upload image file</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="https://... or /maps/game-map.jpg"
                        value={activeMap.imageUrl || ""}
                        onChange={(e) => handleUpdateActiveMap("imageUrl", e.target.value)}
                        className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-xs placeholder:text-zinc-700"
                      />
                      <label className="px-3 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-orange-400 text-xs font-semibold cursor-pointer shrink-0 flex items-center gap-1">
                        <Upload size={13} />
                        <span className="hidden sm:inline">Upload</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                if (event.target?.result) {
                                  handleUpdateActiveMap("imageUrl", event.target.result as string);
                                }
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Split View: Interactive Visual Map (Left) + Step-by-Step Checklist Maker (Right) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Visual Map Canvas Column */}
                <div className="lg:col-span-7 bg-black border border-zinc-900 rounded-2xl overflow-hidden p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-orange-400 uppercase tracking-wider">Interactive Map Pinning</span>
                      <span className="text-zinc-500 font-mono text-[11px]">
                        X: {stepX}% | Y: {stepY}%
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-zinc-400">
                      <button
                        type="button"
                        onClick={() => setCanvasZoom((prev) => Math.min(3, prev + 0.25))}
                        className="p-1 hover:text-white bg-zinc-900 rounded"
                        title="Zoom In"
                      >
                        <ZoomIn size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setCanvasZoom((prev) => Math.max(1, prev - 0.25))}
                        className="p-1 hover:text-white bg-zinc-900 rounded"
                        title="Zoom Out"
                      >
                        <ZoomOut size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setCanvasZoom(1)}
                        className="p-1 hover:text-white bg-zinc-900 rounded"
                        title="Reset Zoom"
                      >
                        <RotateCcw size={13} />
                      </button>
                    </div>
                  </div>

                  <p className="text-[11px] text-zinc-400 bg-zinc-950/80 p-2 rounded-lg border border-zinc-900">
                    💡 <strong className="text-orange-300">Click anywhere on the map</strong> to place Pin #{stepNum}, or <strong className="text-orange-300">drag the pulsing marker</strong> to adjust coordinates!
                  </p>

                  {/* Interactive Map Visual Viewport */}
                  <div
                    ref={mapCanvasRef}
                    onMouseDown={handleCanvasMouseDown}
                    onMouseMove={handleCanvasMouseMove}
                    onMouseUp={handleCanvasMouseUp}
                    onMouseLeave={handleCanvasMouseUp}
                    className="relative w-full h-[400px] sm:h-[460px] bg-[#07090e] border border-zinc-850 rounded-xl overflow-hidden cursor-crosshair select-none flex items-center justify-center"
                    style={{
                      backgroundImage: "radial-gradient(#1e293b 1px, transparent 1px)",
                      backgroundSize: "24px 24px",
                    }}
                  >
                    {activeMap.imageUrl ? (
                      <img
                        src={activeMap.imageUrl}
                        alt={activeMap.name}
                        className="w-full h-full object-contain pointer-events-none select-none transition-transform"
                        style={{ transform: `scale(${canvasZoom})` }}
                      />
                    ) : (
                      <div className="text-center p-6 text-zinc-600 pointer-events-none">
                        <ImageIcon size={36} className="mx-auto mb-2 text-zinc-700" />
                        <p className="text-xs font-semibold text-zinc-500">No map image imported for {activeMap.name}</p>
                        <p className="text-[10px] text-zinc-600 mt-1">Paste an image URL or upload above. You can still click to set X% and Y% coordinates!</p>
                      </div>
                    )}

                    {/* Placed Pins on Active Map */}
                    {activeMapSteps.map((s) => (
                      <div
                        key={s.id}
                        style={{ left: `${s.x}%`, top: `${s.y}%` }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditStep(s);
                        }}
                        className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer z-10 transition-transform ${
                          editingStepId === s.id ? "scale-125 z-30" : "hover:scale-115"
                        }`}
                        title={`#${s.id}: ${s.locationText} (Click to edit)`}
                      >
                        <span className="w-6 h-6 rounded-full bg-orange-500 text-black font-extrabold text-[10px] flex items-center justify-center shadow-lg border border-black ring-2 ring-orange-500/50">
                          {s.id}
                        </span>
                      </div>
                    ))}

                    {/* Current Active Pin Being Placed / Dragged */}
                    <div
                      style={{ left: `${stepX}%`, top: `${stepY}%` }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 z-40 cursor-grab active:cursor-grabbing pointer-events-auto"
                      title="Drag me to adjust pin location!"
                    >
                      <span className="absolute -inset-2.5 rounded-full bg-amber-400 opacity-75 animate-ping pointer-events-none" />
                      <div className="w-8 h-8 rounded-full bg-amber-400 text-black font-extrabold text-xs flex items-center justify-center shadow-[0_0_15px_rgba(251,191,36,1)] border-2 border-white ring-2 ring-black">
                        #{stepNum}
                      </div>
                      <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 bg-black/90 text-amber-300 text-[9px] font-mono px-1 rounded border border-amber-500/40 whitespace-nowrap">
                        {stepX}%, {stepY}%
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step-by-Step Checklist Builder Column */}
                <div className="lg:col-span-5 space-y-4">
                  {/* Step Editor Form */}
                  <div className="p-4 bg-zinc-950/80 border border-zinc-850 rounded-2xl space-y-3 shadow-xl">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                        {editingStepId !== null ? `Editing Step #${editingStepId}` : "Step Details & Pin Link"}
                      </span>
                      {editingStepId !== null && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingStepId(null);
                            setStepLocation("");
                            setStepDetails("");
                          }}
                          className="text-[11px] text-zinc-400 hover:text-white"
                        >
                          Cancel Edit
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[11px] text-zinc-400 mb-1">Step #</label>
                        <input
                          type="number"
                          value={stepNum}
                          onChange={(e) => setStepNum(Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 bg-black border border-zinc-800 rounded-lg text-white font-mono text-xs"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="block text-[11px] text-zinc-400 mb-1">Region / Area</label>
                        <input
                          type="text"
                          placeholder="e.g. Paleto Bay"
                          value={stepRegion}
                          onChange={(e) => setStepRegion(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-black border border-zinc-800 rounded-lg text-white text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">Location Description *</label>
                      <input
                        type="text"
                        placeholder="e.g. On the roof of the fire station behind the antenna"
                        value={stepLocation}
                        onChange={(e) => setStepLocation(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-black border border-zinc-800 rounded-lg text-white text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">Hint / Gameplay Note (optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. Climb the yellow maintenance ladder on the west wall."
                        value={stepDetails}
                        onChange={(e) => setStepDetails(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-black border border-zinc-800 rounded-lg text-white text-xs"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] text-zinc-400 mb-1">Assigned Map</label>
                        <select
                          value={activeMapId}
                          onChange={(e) => setActiveMapId(e.target.value)}
                          className="w-full px-2 py-1.5 bg-black border border-zinc-800 rounded-lg text-white text-xs"
                        >
                          {maps.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] text-zinc-400 mb-1">Pin Coords (X%, Y%)</label>
                        <div className="flex gap-1">
                          <input
                            type="number"
                            step="0.1"
                            value={stepX}
                            onChange={(e) => setStepX(Number(e.target.value))}
                            className="w-1/2 px-2 py-1.5 bg-black border border-zinc-800 rounded-lg text-white font-mono text-xs text-center"
                          />
                          <input
                            type="number"
                            step="0.1"
                            value={stepY}
                            onChange={(e) => setStepY(Number(e.target.value))}
                            className="w-1/2 px-2 py-1.5 bg-black border border-zinc-800 rounded-lg text-white font-mono text-xs text-center"
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleSaveStep}
                      className="w-full py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-black font-extrabold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md mt-1"
                    >
                      <Plus size={14} />
                      <span>{editingStepId !== null ? "Update Step" : `Add Step #${stepNum} to Checklist`}</span>
                    </button>
                  </div>

                  {/* Checklist Items Preview List */}
                  <div className="p-4 bg-black border border-zinc-900 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white uppercase tracking-wider">
                        Checklist Steps ({steps.length})
                      </span>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {activeMapSteps.length} on {activeMap.name}
                      </span>
                    </div>

                    {steps.length > 0 ? (
                      <div className="max-h-56 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                        {steps.map((st) => {
                          const isCurrentMap = !st.mapId || st.mapId === activeMapId;
                          return (
                            <div
                              key={st.id}
                              onClick={() => handleEditStep(st)}
                              className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between gap-2 ${
                                editingStepId === st.id
                                  ? "bg-orange-500/10 border-orange-500/60"
                                  : isCurrentMap
                                  ? "bg-zinc-950 border-zinc-850 hover:border-zinc-700"
                                  : "bg-zinc-950/40 border-zinc-900 text-zinc-500"
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <span className="font-bold font-mono text-amber-400 shrink-0">#{st.id}</span>
                                <div className="truncate">
                                  <p className="font-semibold text-white truncate">{st.locationText}</p>
                                  <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                                    <span>{st.region}</span>
                                    <span>&bull;</span>
                                    <span>({st.x}%, {st.y}%)</span>
                                    {maps.length > 1 && st.mapId && (
                                      <>
                                        <span>&bull;</span>
                                        <span className="text-orange-400/80">
                                          {maps.find((m) => m.id === st.mapId)?.name || "Map"}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditStep(st);
                                  }}
                                  className="p-1 text-zinc-400 hover:text-white transition-colors"
                                  title="Edit Step"
                                >
                                  <Edit2 size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteStep(st.id);
                                  }}
                                  className="p-1 text-zinc-500 hover:text-red-400 transition-colors"
                                  title="Delete Step"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-zinc-600 py-4 text-center">
                        No steps added yet. Click on the map and press &quot;Add Step&quot; above.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Raw JSON Mode */}
          {activeTab === "json" && (
            <div className="space-y-3">
              <p className="text-xs text-zinc-400">
                Directly edit or copy the complete guide JSON payload. Full synchronization with Visual Designer.
              </p>
              <textarea
                rows={16}
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                className="w-full p-4 font-mono text-xs bg-black border border-zinc-800 rounded-2xl text-zinc-300 focus:outline-none focus:border-orange-500/50 custom-scrollbar"
                spellCheck="false"
              />
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-850 bg-black/60">
          <div className="text-xs text-zinc-500">
            {steps.length} steps &bull; {maps.length} {maps.length === 1 ? "map" : "maps"} &bull; {attachedAchievements.length} achievements attached
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 transition-colors"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSaveToDynamoDb}
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl text-xs font-extrabold text-black bg-gradient-to-r from-orange-500 via-amber-400 to-yellow-400 hover:from-orange-600 hover:to-yellow-500 shadow-lg shadow-orange-500/20 flex items-center gap-2 disabled:opacity-50 transition-all"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Saving Guide to DynamoDB...</span>
                </>
              ) : (
                <>
                  <Save size={14} />
                  <span>Save Guide to DynamoDB</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
