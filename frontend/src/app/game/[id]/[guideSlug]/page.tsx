import React from "react";
import Link from "next/link";
import { getGameDetails, getCollectibleGuide } from "@/lib/api";
import StepByStepGuideViewer from "@/components/guide/StepByStepGuideViewer";
import { ChevronRight, ArrowLeft, Gamepad2 } from "lucide-react";
import { notFound } from "next/navigation";

export default async function CollectibleGuidePage({
  params,
}: {
  params: Promise<{ id: string; guideSlug: string }>;
}) {
  const { id, guideSlug } = await params;
  const game = await getGameDetails(id);
  const guide = await getCollectibleGuide(id, guideSlug);

  if (!game || !guide || guide.totalCount === 0) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Breadcrumb Navigation Header */}
      <div className="border-b border-zinc-900 bg-black/90 backdrop-blur-md sticky top-16 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between text-xs sm:text-sm text-zinc-400">
          <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap">
            <Link href="/" className="hover:text-white transition-colors flex items-center gap-1.5">
              <Gamepad2 size={15} className="text-orange-400" />
              <span>Home</span>
            </Link>
            <ChevronRight size={13} className="text-zinc-600 shrink-0" />
            <Link href={`/game/${id}`} className="hover:text-white transition-colors truncate max-w-[150px] sm:max-w-none">
              {game.name}
            </Link>
            <ChevronRight size={13} className="text-zinc-600 shrink-0" />
            <span className="text-orange-400 font-medium truncate max-w-[200px] sm:max-w-none">
              {guide.title}
            </span>
          </div>

          <Link
            href={`/game/${id}`}
            className="flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors shrink-0 ml-4"
          >
            <ArrowLeft size={14} />
            <span className="hidden sm:inline">Back to Game</span>
          </Link>
        </div>
      </div>

      {/* Main Guide & Map Content */}
      <main className="max-w-6xl mx-auto px-4 mt-8">
        <StepByStepGuideViewer guide={guide} gameName={game.name} />
      </main>
    </div>
  );
}
