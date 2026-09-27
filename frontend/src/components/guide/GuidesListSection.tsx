"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { GuideMeta } from "@/types";
import { listGameGuides, deleteCollectibleGuide } from "@/lib/api";
import GuideCreatorModal from "./GuideCreatorModal";
import { MapPin, Plus, Trash2, ExternalLink, Compass, Database } from "lucide-react";

interface GuidesListSectionProps {
  gameId: string;
  gameSlug?: string;
  initialGuides?: GuideMeta[];
}

export default function GuidesListSection({
  gameId,
  gameSlug = "game",
  initialGuides = [],
}: GuidesListSectionProps) {
  const [guides, setGuides] = useState<GuideMeta[]>(initialGuides);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchGuides = async () => {
    setLoading(true);
    const data = await listGameGuides(gameId);
    setGuides(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchGuides();
  }, [gameId]);

  const handleDelete = async (slug: string, title: string) => {
    if (window.confirm(`Are you sure you want to delete the guide '${title}' from DynamoDB?`)) {
      const res = await deleteCollectibleGuide(gameId, slug);
      if (res.success) {
        fetchGuides();
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold font-outfit text-white flex items-center gap-2.5">
            <Compass size={24} className="text-orange-400" />
            <span>Interactive Guides & Maps</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Step-by-step collectible guides loaded directly from DynamoDB
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 rounded-xl text-xs font-bold text-black bg-gradient-to-r from-orange-500 via-amber-400 to-yellow-400 hover:from-orange-600 hover:to-yellow-500 shadow-md shadow-orange-500/20 flex items-center gap-1.5 self-start sm:self-auto transition-all"
        >
          <Plus size={15} />
          <span>Create New Guide</span>
        </button>
      </div>

      {/* Guides Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {guides.length > 0 ? (
          guides.map((guide) => (
            <div
              key={guide.guideSlug}
              className="p-5 bg-black border border-zinc-900 rounded-2xl shadow-xl hover:border-orange-500/40 hover:shadow-orange-500/5 transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-orange-400 px-2 py-0.5 rounded bg-orange-500/10 border border-orange-500/20">
                    {guide.totalCount} Locations
                  </span>

                  <button
                    onClick={() => handleDelete(guide.guideSlug, guide.title)}
                    className="text-zinc-600 hover:text-red-400 p-1 transition-colors"
                    title="Delete Guide from Database"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <h3 className="text-lg font-bold font-outfit text-white group-hover:text-amber-400 transition-colors">
                  {guide.title}
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Interactive vector map, verified coordinates & step-by-step checklist.
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-zinc-900 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                  <Database size={12} className="text-orange-400/80" />
                  <span>DynamoDB Loaded</span>
                </div>

                <Link
                  href={`/game/${gameId}/${guide.guideSlug}`}
                  className="text-xs font-bold text-orange-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
                >
                  <span>Open Map & Guide</span>
                  <ExternalLink size={13} />
                </Link>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full p-8 text-center bg-black border border-zinc-900 rounded-2xl text-zinc-500 text-sm space-y-2">
            <p>No custom guides created yet for this game.</p>
            <p className="text-xs text-zinc-600">Click &quot;Create New Guide&quot; above to create one using the framework.</p>
          </div>
        )}
      </div>

      {/* Guide Creator Modal */}
      <GuideCreatorModal
        gameId={gameId}
        gameSlug={gameSlug}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onGuideCreated={fetchGuides}
      />
    </div>
  );
}
