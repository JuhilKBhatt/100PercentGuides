"use client";

import React, { useState, useRef, useEffect } from "react";
import { useSteamAuth } from "@/context/SteamAuthContext";
import { LogOut, ExternalLink, ChevronDown, User, Key } from "lucide-react";
import ManualSteamModal from "./ManualSteamModal";

export function SteamIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0zM7.54 18.21l-1.473-.61c.262.543.714.999 1.314 1.25 1.297.539 2.793-.076 3.332-1.375.263-.63.264-1.319.005-1.949s-.75-1.121-1.377-1.383c-.624-.26-1.29-.249-1.878-.03l1.523.63c.956.4 1.409 1.5 1.009 2.455-.397.957-1.497 1.41-2.454 1.012H7.54zm11.415-9.303c0-1.662-1.353-3.015-3.015-3.015-1.665 0-3.015 1.353-3.015 3.015 0 1.665 1.35 3.015 3.015 3.015 1.663 0 3.015-1.35 3.015-3.015zm-5.273-.005c0-1.252 1.013-2.266 2.265-2.266 1.249 0 2.266 1.014 2.266 2.266 0 1.251-1.017 2.265-2.266 2.265-1.253 0-2.265-1.014-2.265-2.265z" fillRule="evenodd" clipRule="evenodd" />
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
          title="Connect via Steam ID or Profile URL (View Privacy Collection Notice)"
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
