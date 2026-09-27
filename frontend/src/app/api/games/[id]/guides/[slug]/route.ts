import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; slug: string }> }
) {
  const { id, slug } = await params;
  try {
    const res = await fetch(`${BACKEND_URL}/api/games/${id}/guides/${slug}`, { cache: "no-store" });
    if (!res.ok) {
      return NextResponse.json({ error: "Guide not found" }, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; slug: string }> }
) {
  const { id, slug } = await params;
  try {
    const res = await fetch(`${BACKEND_URL}/api/games/${id}/guides/${slug}`, {
      method: "DELETE",
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
