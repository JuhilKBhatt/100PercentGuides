"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { SteamUser } from "@/types";
import { getCurrentSteamUser, connectManualSteam, logoutSteam, initiateSteamLogin } from "@/lib/steamAuth";

interface SteamAuthContextType {
  user: SteamUser | null;
  isLoading: boolean;
  login: (returnUrl?: string) => void;
  logout: () => Promise<void>;
  connectManual: (identifier: string) => Promise<{ success: boolean; error?: string }>;
  refreshUser: () => Promise<void>;
}

const SteamAuthContext = createContext<SteamAuthContextType | undefined>(undefined);

export function SteamAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SteamUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      setIsLoading(true);
      const currentUser = await getCurrentSteamUser();
      setUser(currentUser);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = useCallback((returnUrl?: string) => {
    initiateSteamLogin(returnUrl);
  }, []);

  const logout = useCallback(async () => {
    await logoutSteam();
    setUser(null);
  }, []);

  const connectManual = useCallback(async (identifier: string) => {
    setIsLoading(true);
    try {
      const res = await connectManualSteam(identifier);
      if (res.success && res.user) {
        setUser(res.user);
        return { success: true };
      }
      return { success: false, error: res.error || "Failed to connect Steam account" };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <SteamAuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        connectManual,
        refreshUser,
      }}
    >
      {children}
    </SteamAuthContext.Provider>
  );
}

export function useSteamAuth() {
  const context = useContext(SteamAuthContext);
  if (!context) {
    throw new Error("useSteamAuth must be used within a SteamAuthProvider");
  }
  return context;
}
