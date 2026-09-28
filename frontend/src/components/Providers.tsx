"use client";

import React from "react";
import { SteamAuthProvider } from "@/context/SteamAuthContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  return <SteamAuthProvider>{children}</SteamAuthProvider>;
}
