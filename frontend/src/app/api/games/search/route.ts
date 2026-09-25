import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://backend:8080";

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
