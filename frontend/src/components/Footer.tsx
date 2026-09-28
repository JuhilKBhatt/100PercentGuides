import React from "react";
import Link from "next/link";
import { Shield, Scale, ExternalLink, Copyright } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full bg-black border-t border-zinc-900 text-zinc-400 py-12 px-4 sm:px-6 lg:px-8 mt-20">
      <div className="max-w-6xl mx-auto space-y-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand & Purpose */}
          <div className="md:col-span-2 space-y-3">
            <Link href="/" className="inline-flex items-center gap-2 text-xl font-extrabold font-outfit text-white tracking-tight">
              <span>100Percent<span className="text-orange-500">Guides</span></span>
            </Link>
            <p className="text-sm text-zinc-400 max-w-sm leading-relaxed">
              Step-by-step interactive achievement roadmaps, vector maps, and dynamic Steam sync built for 100% game completionists worldwide.
            </p>
            <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500 pt-2">
              <span className="flex items-center gap-1.5 text-zinc-400">
                <Shield size={14} className="text-orange-400" />
                GDPR &bull; CCPA &bull; APPs
              </span>
              <span className="text-zinc-700">&bull;</span>
              <span className="flex items-center gap-1.5 text-zinc-400">
                <Scale size={14} className="text-amber-400" />
                ACL &bull; FTC Compliant
              </span>
              <span className="text-zinc-700">&bull;</span>
              <span className="flex items-center gap-1 text-zinc-400">
                <Copyright size={13} className="text-zinc-500" />
                DMCA Safe Harbor
              </span>
            </div>
          </div>

          {/* Quick Navigation */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white font-outfit">Platform</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/" className="hover:text-orange-400 transition-colors">
                  Home &amp; Search
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-orange-400 transition-colors">
                  Privacy Policy (Global)
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-orange-400 transition-colors">
                  Terms of Service &amp; DMCA
                </Link>
              </li>
            </ul>
          </div>

          {/* Compliance & Disclosures */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white font-outfit">Disclosures</h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              <strong>Affiliate Notice:</strong> We may earn an affiliate commission when you purchase games through links on this site (FTC &amp; ACL compliant).
            </p>
            <p className="text-xs text-zinc-500 leading-relaxed">
              <strong>Trademark Notice:</strong> Steam and all video game titles are trademarks of Valve Corporation and their respective copyright holders.
            </p>
          </div>
        </div>

        {/* Disclaimer & Copyright */}
        <div className="pt-8 border-t border-zinc-900/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-400">
          <p>
            &copy; {currentYear} 100PercentGuides. All rights reserved. Guides provided for educational and commentary purposes.
          </p>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="hover:text-orange-400 transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-orange-400 transition-colors">
              Terms &amp; DMCA
            </Link>
            <a 
              href="https://store.steampowered.com" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="hover:text-zinc-300 flex items-center gap-1 transition-colors"
            >
              Steam Store <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
