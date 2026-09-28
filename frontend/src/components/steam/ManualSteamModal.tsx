"use client";

import React, { useState } from "react";
import { useSteamAuth } from "@/context/SteamAuthContext";
import { X, Loader2, Link2, AlertCircle } from "lucide-react";

interface ManualSteamModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ManualSteamModal({ isOpen, onClose }: ManualSteamModalProps) {
  const { connectManual } = useSteamAuth();
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
            <h3 className="text-lg font-bold font-outfit text-white">Connect Steam Profile</h3>
            <p className="text-xs text-zinc-400">Enter your Steam ID or custom profile URL</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Steam ID64 or Profile Link
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
            <p className="text-[11px] text-zinc-500 mt-1.5">
              Tip: Your profile must have &quot;Game details: Public&quot; in Steam Privacy Settings to allow achievement syncing.
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

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
