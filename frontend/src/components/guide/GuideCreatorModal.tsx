"use client";

import React, { useState } from "react";
import { CollectibleGuide } from "@/types";
import { saveCollectibleGuide } from "@/lib/api";
import { 
  Plus, 
  X, 
  Save, 
  Code, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  MapPin, 
  Loader2 
} from "lucide-react";

interface GuideCreatorModalProps {
  gameId: string;
  gameSlug?: string;
  isOpen: boolean;
  onClose: () => void;
  onGuideCreated?: () => void;
}

export default function GuideCreatorModal({
  gameId,
  gameSlug = "game",
  isOpen,
  onClose,
  onGuideCreated,
}: GuideCreatorModalProps) {
  const [mode, setMode] = useState<"form" | "json">("form");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [viewBox, setViewBox] = useState("0 0 1024 1440");
  
  // Single item to add
  const [itemNum, setItemNum] = useState(1);
  const [itemRegion, setItemRegion] = useState("");
  const [itemLocation, setItemLocation] = useState("");
  const [itemX, setItemX] = useState<number>(500);
  const [itemY, setItemY] = useState<number>(700);
  
  // Added items
  const [addedItems, setAddedItems] = useState<{
    id: number;
    name: string;
    region: string;
    locationText: string;
    x: number;
    y: number;
  }[]>([]);

  // Raw JSON State with clean template
  const [jsonText, setJsonText] = useState(JSON.stringify({
    gameId: gameId,
    gameSlug: gameSlug,
    guideSlug: "custom-collectibles",
    title: "All Collectibles Guide",
    subtitle: "Interactive Map & Step-by-Step Locations Checklist",
    totalCount: 1,
    requiredForCompletion: 1,
    mapViewBox: "0 0 1024 1440",
    regions: [
      {
        id: "region_1",
        name: "North Region",
        itemCount: 1,
        items: [
          {
            id: 1,
            name: "Collectible #1",
            region: "North Region",
            locationText: "Near the coastal lighthouse on the cliff edge",
            details: "Look behind the wooden fence next to the generator.",
            x: 520,
            y: 340
          }
        ]
      }
    ]
  }, null, 2));

  if (!isOpen) return null;

  const handleAddItem = () => {
    if (!itemLocation.trim()) {
      setErrorMessage("Location description is required to add a step.");
      return;
    }
    const regionName = itemRegion.trim() || "General Area";
    setAddedItems((prev) => [
      ...prev,
      {
        id: itemNum,
        name: `Item #${itemNum}`,
        region: regionName,
        locationText: itemLocation.trim(),
        x: Number(itemX) || 500,
        y: Number(itemY) || 700,
      },
    ]);
    setItemNum((prev) => prev + 1);
    setItemLocation("");
    setErrorMessage(null);
  };

  const handleSave = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      let payload: CollectibleGuide;

      if (mode === "json") {
        try {
          payload = JSON.parse(jsonText);
        } catch (e: any) {
          setErrorMessage("Invalid JSON format: " + e.message);
          setIsSubmitting(false);
          return;
        }
      } else {
        if (!title.trim() || !slug.trim()) {
          setErrorMessage("Guide Title and URL Slug are required.");
          setIsSubmitting(false);
          return;
        }

        // Group added items by region
        const regionsMap: Record<string, typeof addedItems> = {};
        addedItems.forEach((it) => {
          if (!regionsMap[it.region]) regionsMap[it.region] = [];
          regionsMap[it.region].push(it);
        });

        const regions = Object.keys(regionsMap).map((regName) => ({
          id: regName.toLowerCase().replace(/\s+/g, "_"),
          name: regName,
          itemCount: regionsMap[regName].length,
          items: regionsMap[regName],
        }));

        payload = {
          gameId,
          gameSlug,
          guideSlug: slug.toLowerCase().trim().replace(/\s+/g, "-"),
          title: title.trim(),
          subtitle: subtitle.trim() || "Interactive Map & Step-by-Step Locations Checklist",
          totalCount: addedItems.length,
          requiredForCompletion: addedItems.length,
          mapViewBox: viewBox.trim() || "0 0 1024 1440",
          regions: regions.length > 0 ? regions : [
            {
              id: "general",
              name: "General Area",
              itemCount: 0,
              items: [],
            }
          ],
        };
      }

      payload.gameId = gameId;

      const res = await saveCollectibleGuide(gameId, payload);
      if (res.success) {
        setSuccessMessage(`Guide '${payload.title}' saved directly to DynamoDB!`);
        setTimeout(() => {
          if (onGuideCreated) onGuideCreated();
          onClose();
        }, 1200);
      } else {
        setErrorMessage(res.message || "Failed to save guide to DynamoDB.");
      }
    } catch (e: any) {
      setErrorMessage(e.message || "Failed to save guide.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-black border border-zinc-800 w-full max-w-3xl rounded-2xl shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto custom-scrollbar">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
              <MapPin size={20} />
            </div>
            <div>
              <h3 className="font-bold font-outfit text-xl text-white">Guide Creator Framework</h3>
              <p className="text-xs text-zinc-400">Create and persist interactive guides & map pins in DynamoDB</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Mode Toggle */}
            <div className="flex items-center bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-xs">
              <button
                type="button"
                onClick={() => setMode("form")}
                className={`px-3 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${
                  mode === "form" ? "bg-orange-500 text-black font-bold" : "text-zinc-400 hover:text-white"
                }`}
              >
                <FileText size={13} />
                <span>Form</span>
              </button>
              <button
                type="button"
                onClick={() => setMode("json")}
                className={`px-3 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${
                  mode === "json" ? "bg-orange-500 text-black font-bold" : "text-zinc-400 hover:text-white"
                }`}
              >
                <Code size={13} />
                <span>JSON</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-white bg-zinc-950 hover:bg-zinc-900 rounded-xl transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Notifications */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
        {successMessage && (
          <div className="mb-4 p-3 rounded-xl bg-green-500/10 border border-green-500/30 text-green-300 text-xs flex items-center gap-2">
            <CheckCircle size={16} className="shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Form Mode */}
        {mode === "form" ? (
          <div className="space-y-5 text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Guide Title *</label>
                <input
                  type="text"
                  placeholder="e.g. All 50 Letter Scraps"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">URL Slug *</label>
                <input
                  type="text"
                  placeholder="e.g. letter-scraps"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Subtitle / Guide Description</label>
              <input
                type="text"
                placeholder="e.g. Interactive Map, Verified Locations & 100% Completion Checklist"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500/50"
              />
            </div>

            {/* Add Map Step / Location Row */}
            <div className="p-4 bg-zinc-950/70 border border-zinc-900 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-orange-400 uppercase tracking-wider">Add Map Location & Checklist Step</span>
                <span className="text-xs text-zinc-500 font-mono">Items added: {addedItems.length}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-1">
                  <label className="block text-[11px] text-zinc-400 mb-1">Step #</label>
                  <input
                    type="number"
                    value={itemNum}
                    onChange={(e) => setItemNum(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-black border border-zinc-800 rounded-lg text-white font-mono text-xs"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-[11px] text-zinc-400 mb-1">Region / Area Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Paleto Bay"
                    value={itemRegion}
                    onChange={(e) => setItemRegion(e.target.value)}
                    className="w-full px-3 py-2 bg-black border border-zinc-800 rounded-lg text-white text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">Exact Location Description *</label>
                <input
                  type="text"
                  placeholder="e.g. 750 m E of Paleto Bay on cliff rocks"
                  value={itemLocation}
                  onChange={(e) => setItemLocation(e.target.value)}
                  className="w-full px-3 py-2 bg-black border border-zinc-800 rounded-lg text-white text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">Map Pin X Coordinate</label>
                  <input
                    type="number"
                    value={itemX}
                    onChange={(e) => setItemX(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-black border border-zinc-800 rounded-lg text-white font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">Map Pin Y Coordinate</label>
                  <input
                    type="number"
                    value={itemY}
                    onChange={(e) => setItemY(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-black border border-zinc-800 rounded-lg text-white font-mono text-xs"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddItem}
                className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 text-orange-400 border border-orange-500/20 font-semibold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <Plus size={14} />
                <span>Add Step to Guide ({addedItems.length} added)</span>
              </button>
            </div>

            {/* List of currently added items */}
            {addedItems.length > 0 && (
              <div className="max-h-40 overflow-y-auto space-y-1.5 p-2 bg-black border border-zinc-900 rounded-xl divide-y divide-zinc-900">
                {addedItems.map((it, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs pt-1">
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-bold font-mono text-amber-400">#{it.id}</span>
                      <span className="text-zinc-300 truncate">{it.locationText}</span>
                      <span className="text-[10px] text-zinc-500">({it.region})</span>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-600">({it.x}, {it.y})</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* JSON Mode */
          <div className="space-y-3">
            <p className="text-xs text-zinc-400">
              Paste or edit the complete guide JSON. Supports custom regions, step-by-step descriptions, and vector map pin coordinates.
            </p>
            <textarea
              rows={14}
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              className="w-full p-3 font-mono text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-300 focus:outline-none focus:border-orange-500/50 custom-scrollbar"
              spellCheck="false"
            />
          </div>
        )}

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-zinc-800/80">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white bg-zinc-950 border border-zinc-800 transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-xl text-xs font-extrabold text-black bg-gradient-to-r from-orange-500 via-amber-400 to-yellow-400 hover:from-orange-600 hover:to-yellow-500 shadow-lg shadow-orange-500/20 flex items-center gap-2 disabled:opacity-50 transition-all"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Saving to DynamoDB...</span>
              </>
            ) : (
              <>
                <Save size={14} />
                <span>Save Guide to Database</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
