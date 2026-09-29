import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { getGameDetails, getCollectibleGuide } from "@/lib/api";
import StepByStepGuideViewer from "@/components/guide/StepByStepGuideViewer";
import JsonLd from "@/components/seo/JsonLd";
import { ChevronRight, ArrowLeft, Gamepad2 } from "lucide-react";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ id: string; guideSlug: string }>;
}

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://100percentguides.com";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id, guideSlug } = await params;
  const game = await getGameDetails(id);
  const guide = await getCollectibleGuide(id, guideSlug);

  if (!game || !guide) {
    return {
      title: "Guide Not Found",
      description: "The requested guide could not be found.",
    };
  }

  const title = `${guide.title} - ${game.name} 100% Guide`;
  const description = guide.subtitle || `Step-by-step checklist, interactive map, and milestone walkthrough for ${guide.title} in ${game.name}. Complete 100% of game achievements.`;

  return {
    title,
    description,
    alternates: {
      canonical: `${siteUrl}/game/${id}/${guideSlug}`,
    },
    openGraph: {
      title,
      description,
      url: `${siteUrl}/game/${id}/${guideSlug}`,
      type: "article",
      images: game.background_image ? [{ url: game.background_image }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: game.background_image ? [game.background_image] : [],
    },
  };
}

export default async function CollectibleGuidePage({ params }: Props) {
  const { id, guideSlug } = await params;
  const game = await getGameDetails(id);
  const guide = await getCollectibleGuide(id, guideSlug);

  if (!game || !guide || guide.totalCount === 0) {
    notFound();
  }

  // Schema.org HowTo Structured Data for Google Rich Snippets & AI Overviews
  const allItems = guide.regions.flatMap((r) => r.items);
  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: guide.title,
    description: guide.subtitle || `Step-by-step instructions to complete ${guide.title} in ${game.name}.`,
    image: game.background_image,
    totalTime: "PT2H",
    step: allItems.slice(0, 30).map((item, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      name: item.name,
      text: item.locationText + (item.details ? ` - ${item.details}` : ""),
      image: item.imageUrl,
    })),
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: siteUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: game.name,
        item: `${siteUrl}/game/${id}`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: guide.title,
        item: `${siteUrl}/game/${id}/${guideSlug}`,
      },
    ],
  };

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Schema.org Structured Data */}
      <JsonLd data={howToSchema} />
      <JsonLd data={breadcrumbSchema} />

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
