import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://backend:8080";
const SAFE_ID_REGEX = /^[a-zA-Z0-9_-]{1,64}$/;

function isAuthorizedOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (!host) return false;
  if (!origin) {
    const referer = request.headers.get("referer");
    if (!referer) return true; // Allow internal/CLI calls without Origin/Referer
    try {
      return new URL(referer).host === host;
    } catch {
      return false;
    }
  }
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!SAFE_ID_REGEX.test(id)) {
    return NextResponse.json({ error: "Invalid game id format" }, { status: 400 });
  }

  try {
    const res = await fetch(`${BACKEND_URL}/api/games/${id}/guides`, { cache: "no-store" });
    if (!res.ok) {
      return NextResponse.json({ error: "Failed to list guides" }, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Anti-CSRF Origin Validation
  if (!isAuthorizedOrigin(request)) {
    return NextResponse.json({ error: "Cross-site requests prohibited" }, { status: 403 });
  }

  const { id } = await params;
  if (!SAFE_ID_REGEX.test(id)) {
    return NextResponse.json({ error: "Invalid game id format" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const res = await fetch(`${BACKEND_URL}/api/games/${id}/guides`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
