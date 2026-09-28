"use client";

import React, { useState, useRef, useEffect } from "react";
import { useSteamAuth } from "@/context/SteamAuthContext";
import { LogOut, ExternalLink, ChevronDown, User, Key } from "lucide-react";
import ManualSteamModal from "./ManualSteamModal";

export function SteamIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0a12 12 0 0 0-12 12c0 5.4 3.56 9.97 8.53 11.53l3.05-4.44a3.86 3.86 0 0 1-.58-.04l-2.4 1.39a2.53 2.53 0 0 1-3.23-1.07 2.53 2.53 0 0 1 1.07-3.41l3.52-2.03a4.7 4.7 0 0 1 4.54-6.32 4.7 4.7 0 0 1 4.7 4.7 4.7 4.7 0 0 1-5.63 4.6l-3.05 4.43c.48.07.97.11 1.47.11 6.63 0 12-5.37 12-12S18.63 0 12 0zm0 7.8a4.2 4.2 0 1 0 0 8.4 4.2 4.2 0 0 0 0-8.4zm0 1.2a3 3 0 1 1 0 6 3 3 0 0 1 0-6zm-4.7 7.7a1.33 1.33 0 1 0 0 2.66 1.33 1.33 0 0 0 0-2.66z" />
    </svg>
  );
}

export default function SteamAuthButton() {
  const { user, isLoading, login, logout } = useSteamAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (isLoading) {
    return (
      <div className="h-9 w-28 rounded-xl bg-zinc-900/60 animate-pulse border border-zinc-800" />
    );
  }

  if (user) {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-orange-500/40 transition-all text-white group"
        >
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={user.personaName}
              className="w-6 h-6 rounded-lg object-cover border border-zinc-700 group-hover:border-orange-500/60 transition-colors"
            />
          ) : (
            <div className="w-6 h-6 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400">
              <User className="w-3.5 h-3.5" />
            </div>
          )}

          <span className="text-xs font-semibold text-zinc-200 group-hover:text-white max-w-[110px] truncate">
            {user.personaName}
          </span>

          <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />

          <ChevronDown className={`w-3.5 h-3.5 text-zinc-500 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
        </button>

        {dropdownOpen && (
          <div className="absolute right-0 mt-2 w-56 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="px-3 py-2 border-b border-zinc-800/80 mb-1">
              <div className="flex items-center gap-2">
                <SteamIcon className="w-3.5 h-3.5 text-orange-400" />
                <span className="text-[11px] font-bold tracking-wider uppercase text-orange-400">
                  Steam Connected
                </span>
              </div>
              <p className="text-xs font-semibold text-white truncate mt-1">{user.personaName}</p>
              <p className="text-[10px] font-mono text-zinc-500 truncate">ID: {user.steamId}</p>
            </div>

            <a
              href={user.profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-900 transition-colors"
              onClick={() => setDropdownOpen(false)}
            >
              <span>View Steam Profile</span>
              <ExternalLink className="w-3.5 h-3.5 text-zinc-500" />
            </a>

            <button
              onClick={async () => {
                setDropdownOpen(false);
                await logout();
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors mt-1"
            >
              <span>Disconnect</span>
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          onClick={() => login()}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#171a21] hover:bg-[#1b2838] border border-[#2a475e] hover:border-[#66c0f4] text-white text-xs font-semibold shadow-md transition-all group"
        >
          <SteamIcon className="w-4 h-4 text-zinc-300 group-hover:text-white transition-colors" />
          <span className="hidden sm:inline">Sign in with Steam</span>
          <span className="sm:hidden">Steam</span>
        </button>

        <button
          onClick={() => setManualModalOpen(true)}
          title="Connect via Steam ID or Profile URL"
          className="p-2 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-orange-500/40 text-zinc-400 hover:text-orange-400 transition-colors"
        >
          <Key className="w-3.5 h-3.5" />
        </button>
      </div>

      <ManualSteamModal
        isOpen={manualModalOpen}
        onClose={() => setManualModalOpen(false)}
      />
    </>
  );
}
