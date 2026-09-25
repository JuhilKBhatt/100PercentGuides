import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');
  
  if (!q) {
    return NextResponse.json({ results: [] });
  }

  const RAWG_API_KEY = process.env.RAWG_API_KEY;
  
  if (!RAWG_API_KEY) {
    console.error("RAWG API key is missing");
    return NextResponse.json({ error: "Server Configuration Error" }, { status: 500 });
  }

  try {
    const res = await fetch(`https://api.rawg.io/api/games?search=${encodeURIComponent(q)}&key=${RAWG_API_KEY}&page_size=6`);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching games:", error);
    return NextResponse.json({ error: "Failed to fetch games" }, { status: 500 });
  }
}
