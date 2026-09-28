import { NextRequest, NextResponse } from "next/server";
import { SteamUser } from "@/types";

export async function GET(request: NextRequest) {
  const cookie = request.cookies.get("steam_user");
  if (!cookie || !cookie.value) {
    return NextResponse.json({ user: null });
  }

  try {
    const user = JSON.parse(cookie.value) as SteamUser;
    return NextResponse.json({ user });
  } catch (err) {
    return NextResponse.json({ user: null });
  }
}
