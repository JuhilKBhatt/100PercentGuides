"use client";

import React, { useState } from "react";
import { useSteamAuth } from "@/context/SteamAuthContext";
import { X, Loader2, Link2, AlertCircle, Shield, ExternalLink } from "lucide-react";

interface ManualSteamModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SteamIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0a12 12 0 0 0-12 12c0 5.4 3.56 9.97 8.53 11.53l3.05-4.44a3.86 3.86 0 0 1-.58-.04l-2.4 1.39a2.53 2.53 0 0 1-3.23-1.07 2.53 2.53 0 0 1 1.07-3.41l3.52-2.03a4.7 4.7 0 0 1 4.54-6.32 4.7 4.7 0 0 1 4.7 4.7 4.7 4.7 0 0 1-5.63 4.6l-3.05 4.43c.48.07.97.11 1.47.11 6.63 0 12-5.37 12-12S18.63 0 12 0zm0 7.8a4.2 4.2 0 1 0 0 8.4 4.2 4.2 0 0 0 0-8.4zm0 1.2a3 3 0 1 1 0 6 3 3 0 0 1 0-6zm-4.7 7.7a1.33 1.33 0 1 0 0 2.66 1.33 1.33 0 0 0 0-2.66z" />
    </svg>
  );
}

export default function ManualSteamModal({ isOpen, onClose }: ManualSteamModalProps) {
  const { connectManual, login } = useSteamAuth();
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) return;

    setLoading(true);
    setError(null);

    const res = await connectManual(identifier.trim());
    setLoading(false);

    if (res.success) {
      onClose();
    } else {
      setError(res.error || "Failed to link Steam account. Please verify the ID or URL.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-2xl relative text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400">
            <Link2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold font-outfit text-white">Connect Steam Account</h3>
            <p className="text-xs text-zinc-400">Sync live achievements and track your 100% progress</p>
          </div>
        </div>

        {/* Option 1: Official Steam OpenID */}
        <div className="mb-5 pb-5 border-b border-zinc-900 space-y-2">
          <button
            type="button"
            onClick={() => login()}
            className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl bg-[#171a21] hover:bg-[#1b2838] border border-[#2a475e] hover:border-[#66c0f4] text-white text-xs font-bold shadow-md transition-all"
          >
            <SteamIcon className="w-4 h-4 text-[#66c0f4]" />
            <span>Sign in with Official Steam OpenID</span>
            <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
          </button>
          <p className="text-[10px] text-zinc-400 text-center">
            Redirects securely to Valve&apos;s official login portal.
          </p>
        </div>

        {/* Option 2: Manual Profile Connection */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Or Connect via Steam ID64 or Custom URL
            </label>
            <input
              type="text"
              placeholder="e.g. 76561198000000000 or custom vanity URL"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              disabled={loading}
              className="w-full px-3.5 py-2.5 bg-black border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition-colors"
              autoFocus
            />
            <p className="text-[11px] text-zinc-400 mt-1.5">
              Tip: Your profile must have &quot;Game details: Public&quot; in Steam Privacy Settings to allow achievement syncing.
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Australian Privacy Principle (APP 5) Collection Notice */}
          <div className="p-3 bg-zinc-900/60 border border-zinc-800/80 rounded-xl text-[11px] text-zinc-400 space-y-1">
            <div className="flex items-center gap-1.5 text-zinc-300 font-semibold">
              <Shield className="w-3.5 h-3.5 text-orange-400" />
              <span>Privacy Collection Notice (APP 5)</span>
            </div>
            <p className="leading-relaxed">
              100PercentGuides collects your public Steam ID, persona name, avatar, and unlocked achievements solely to display your personalized progress. We never access passwords, email addresses, or payment details. For more information on your access and correction rights, see our{" "}
              <a href="/privacy" target="_blank" className="text-orange-400 underline hover:text-orange-300">
                Privacy Policy
              </a>.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !identifier.trim()}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-black flex items-center gap-2 shadow-lg shadow-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Connect Profile
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
