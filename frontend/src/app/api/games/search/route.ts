import { NextResponse } from "next/server";
import { BACKEND_URL } from "@/lib/api";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");
  
  if (!q) {
    return NextResponse.json({ results: [] });
  }

  try {
    const res = await fetch(`${BACKEND_URL}/api/games/search?q=${encodeURIComponent(q)}`);
    if (!res.ok) {
      return NextResponse.json({ results: [] });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching games from backend:", error);
    return NextResponse.json({ error: "Failed to fetch games" }, { status: 500 });
  }
}
