import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://backend:8080";
const SAFE_ID_REGEX = /^[a-zA-Z0-9_-]{1,64}$/;

function isAuthorizedOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (!host) return false;
  if (!origin) {
    const referer = request.headers.get("referer");
    if (!referer) return true; // Internal or CLI calls
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
  { params }: { params: Promise<{ id: string; slug: string }> }
) {
  const { id, slug } = await params;
  if (!SAFE_ID_REGEX.test(id) || !SAFE_ID_REGEX.test(slug)) {
    return NextResponse.json({ error: "Invalid id or slug format" }, { status: 400 });
  }

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
  // Anti-CSRF Origin Validation for deletion
  if (!isAuthorizedOrigin(request)) {
    return NextResponse.json({ error: "Cross-site requests prohibited" }, { status: 403 });
  }

  const { id, slug } = await params;
  if (!SAFE_ID_REGEX.test(id) || !SAFE_ID_REGEX.test(slug)) {
    return NextResponse.json({ error: "Invalid id or slug format" }, { status: 400 });
  }

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
