import React from "react";
import Link from "next/link";
import { Shield, Lock, Globe, Database, Cookie, CheckCircle2, AlertTriangle, Mail, Scale, UserCheck, EyeOff } from "lucide-react";

export const metadata = {
  title: "Privacy Policy | 100PercentGuides",
  description: "Global Privacy Policy for 100PercentGuides compliant with GDPR, UK GDPR, CCPA/CPRA, and the Australian Privacy Act 1988 (Cth).",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-black text-zinc-300 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-12">
        {/* Header */}
        <div className="space-y-4 border-b border-zinc-900 pb-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-semibold uppercase tracking-wider">
              <Shield size={14} />
              Global Privacy Compliance
            </span>
            <span className="text-xs text-zinc-500 font-mono border border-zinc-800 bg-zinc-950 px-2 py-0.5 rounded">
              GDPR &bull; UK GDPR &bull; CCPA / CPRA &bull; Privacy Act 1988 (Cth)
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold font-outfit text-white tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-sm text-zinc-400">
            Last Updated: 28 September 2026 &bull; Globally effective across Australia, the European Economic Area (EEA), United Kingdom (UK), and United States (US).
          </p>
        </div>

        {/* Section 1: Overview & Scope */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold font-outfit text-white flex items-center gap-2.5">
            <span className="w-2 h-6 rounded-full bg-orange-500 inline-block"></span>
            1. Overview & Global Scope
          </h2>
          <p className="leading-relaxed">
            100PercentGuides (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) provides interactive video game achievement roadmaps and progress tracking tools. We are committed to upholding international standards of data privacy and transparency, specifically complying with:
          </p>
          <ul className="list-disc pl-6 space-y-1.5 text-sm">
            <li><strong>Australia:</strong> The <em>Privacy Act 1988</em> (Cth) and the 13 Australian Privacy Principles (APPs);</li>
            <li><strong>European Union &amp; UK:</strong> Regulation (EU) 2016/679 (EU GDPR) and the UK Data Protection Act 2018 (UK GDPR);</li>
            <li><strong>United States:</strong> The California Consumer Privacy Act as amended by the California Privacy Rights Act (CCPA/CPRA), state privacy regulations, and the Children&apos;s Online Privacy Protection Act (COPPA);</li>
            <li><strong>Canada:</strong> The Personal Information Protection and Electronic Documents Act (PIPEDA).</li>
          </ul>
        </section>

        {/* Section 2: Data Minimization & Categories Collected */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold font-outfit text-white flex items-center gap-2.5">
            <span className="w-2 h-6 rounded-full bg-amber-500 inline-block"></span>
            2. Personal Data We Collect
          </h2>
          <p className="leading-relaxed">
            We adhere strictly to the principle of <strong>data minimization</strong>. We only collect data essential for syncing gameplay progress and operating our guides:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-900 space-y-2">
              <h3 className="font-semibold text-white flex items-center gap-2 text-sm">
                <Database size={16} className="text-orange-400" />
                Public Steam Gaming Data
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                When you connect your Steam account, we collect your public 17-digit Steam ID64, persona display name, public avatar URL, and official achievement unlock timestamps. We <strong>never</strong> request, view, or store Steam passwords, payment credentials, or private chat histories.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-900 space-y-2">
              <h3 className="font-semibold text-white flex items-center gap-2 text-sm">
                <Cookie size={16} className="text-amber-400" />
                Technical &amp; Session Identifiers
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                We utilize essential functional cookies (e.g. <code>steam_user</code> for 30-day session continuity) and local storage (<code>100pg_guide_*</code>) to preserve your checklist ticks directly on your device without transmitting them to any third-party marketing servers.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3: GDPR Lawful Bases for Processing */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold font-outfit text-white flex items-center gap-2.5">
            <span className="w-2 h-6 rounded-full bg-yellow-400 inline-block"></span>
            3. GDPR &amp; UK GDPR Legal Bases (Articles 6 &amp; 13)
          </h2>
          <p className="leading-relaxed">
            If you reside in the EEA or UK, we process your personal data under the following lawful bases:
          </p>
          <div className="space-y-3 bg-zinc-950 border border-zinc-900 rounded-xl p-5 text-sm">
            <div>
              <strong className="text-white">Legitimate Interests (Art. 6(1)(f) GDPR):</strong> Querying public Steam achievement data, multi-tier caching (Redis/DynamoDB) to optimize site speed, protecting against DDoS attacks, and preventing API rate-limiting penalties.
            </div>
            <div>
              <strong className="text-white">Contractual Necessity (Art. 6(1)(b) GDPR):</strong> Providing personalized 100% completion tracking and synchronizing your achievement checklists upon request.
            </div>
            <div>
              <strong className="text-white">Consent (Art. 6(1)(a) GDPR):</strong> Serving non-essential advertising cookies and personalized Google AdSense units, collected through our granular cookie preferences selector.
            </div>
          </div>
        </section>

        {/* Section 4: European & UK Data Subject Rights (Articles 15-22) */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold font-outfit text-white flex items-center gap-2.5">
            <span className="w-2 h-6 rounded-full bg-orange-500 inline-block"></span>
            4. Your Rights Under GDPR &amp; UK GDPR
          </h2>
          <p className="leading-relaxed">
            EEA and UK residents enjoy comprehensive data subject rights regarding their personal data:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-zinc-950 border border-zinc-900 rounded-lg">
              <strong className="text-white block mb-1">Right to Access (Art. 15):</strong> Request a copy of the Steam data and diagnostic records we maintain about you.
            </div>
            <div className="p-3 bg-zinc-950 border border-zinc-900 rounded-lg">
              <strong className="text-white block mb-1">Right to Erasure / &quot;Be Forgotten&quot; (Art. 17):</strong> Request the permanent deletion of your cached profile records and session logs.
            </div>
            <div className="p-3 bg-zinc-950 border border-zinc-900 rounded-lg">
              <strong className="text-white block mb-1">Right to Rectification (Art. 16):</strong> Correct inaccurate data or resync updated Steam progress.
            </div>
            <div className="p-3 bg-zinc-950 border border-zinc-900 rounded-lg">
              <strong className="text-white block mb-1">Right to Object &amp; Withdraw Consent (Art. 21):</strong> Withdraw cookie consent at any time via the cookie banner or browser settings.
            </div>
          </div>
          <p className="text-xs text-zinc-400">
            To exercise any GDPR right, email <span className="text-white font-mono">privacy@100percentguides.com</span>. We fulfill all verified requests within 30 calendar days at no charge. You also have the right to lodge a complaint with your local EU Data Protection Supervisory Authority.
          </p>
        </section>

        {/* Section 5: California & US State Privacy Rights (CCPA / CPRA) */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold font-outfit text-white flex items-center gap-2.5">
            <span className="w-2 h-6 rounded-full bg-amber-500 inline-block"></span>
            5. California &amp; US State Privacy Rights (CCPA / CPRA)
          </h2>
          <p className="leading-relaxed">
            This section applies to California residents and consumers in states with comprehensive consumer privacy laws (e.g., Virginia, Colorado, Connecticut, Utah).
          </p>
          <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-5 space-y-3 text-sm">
            <h3 className="font-bold text-white flex items-center gap-2">
              <EyeOff size={16} className="text-orange-400" />
              Notice at Collection &amp; &quot;Do Not Sell or Share My Personal Information&quot;
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              We do <strong>not</strong> sell your personal information for monetary consideration. However, under the CCPA/CPRA, allowing third-party advertising partners (Google AdSense) to place cookies for cross-context behavioral advertising may be considered &quot;sharing&quot;.
            </p>
            <p className="text-xs text-zinc-400 leading-relaxed">
              <strong>How to Opt-Out:</strong> You can opt out of third-party cookie sharing at any time by selecting &quot;Essential Only&quot; in our Cookie Preferences banner, visiting <a href="https://optout.aboutads.info" target="_blank" rel="noopener noreferrer" className="text-orange-400 underline">Digital Advertising Alliance Opt-Out</a>, or configuring your browser to send a Global Privacy Control (GPC) signal.
            </p>
            <p className="text-xs text-zinc-400 leading-relaxed">
              <strong>Non-Discrimination:</strong> We will never discriminate against you, deny access, or alter your experience because you exercise any CCPA or privacy rights.
            </p>
          </div>
        </section>

        {/* Section 6: Children's Privacy (COPPA & GDPR Article 8) */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold font-outfit text-white flex items-center gap-2.5">
            <span className="w-2 h-6 rounded-full bg-yellow-400 inline-block"></span>
            6. Children&apos;s Privacy (COPPA &amp; GDPR-K)
          </h2>
          <p className="leading-relaxed">
            100PercentGuides is designed for general audiences and is <strong>not directed to children under 13 years of age</strong> (or under 16 in the European Economic Area and UK).
          </p>
          <p className="leading-relaxed text-sm bg-zinc-950 border border-zinc-900 p-4 rounded-xl text-zinc-400">
            We do not knowingly collect or solicit personal information from children under 13. In accordance with the US Children&apos;s Online Privacy Protection Act (COPPA) and GDPR Article 8, if we learn that we have inadvertently collected personal data from a child under the relevant age threshold without verified parental consent, we will promptly purge the data from our databases. If you believe a minor has provided us with personal information, please notify us at <span className="text-white font-mono">privacy@100percentguides.com</span>.
          </p>
        </section>

        {/* Section 7: International Cross-Border Transfers */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold font-outfit text-white flex items-center gap-2.5">
            <span className="w-2 h-6 rounded-full bg-orange-500 inline-block"></span>
            7. International Data Transfers &amp; Standard Safeguards
          </h2>
          <p className="leading-relaxed text-sm">
            To provide our global guide infrastructure, your data may be transferred to and processed in countries outside your country of residence, including Australia and the United States (where AWS, Valve Corporation, and Google maintain data centers).
          </p>
          <p className="leading-relaxed text-sm text-zinc-400">
            For transfers of personal data originating from the EEA or UK, we rely on European Commission Adequacy Decisions, the EU-US Data Privacy Framework, and standard contractual clauses (SCCs) to ensure equivalent legal protection.
          </p>
        </section>

        {/* Section 8: Advertising Standards (Google AdSense Begin-to-Render) */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold font-outfit text-white flex items-center gap-2.5">
            <span className="w-2 h-6 rounded-full bg-amber-500 inline-block"></span>
            8. Advertising Standards &amp; Begin-to-Render Policy
          </h2>
          <p className="leading-relaxed text-sm">
            We partner with Google AdSense to serve non-intrusive banner and card advertisements. In strict compliance with the Media Rating Council (MRC) and Google AdSense global <strong>Begin-to-Render</strong> standards:
          </p>
          <ul className="list-disc pl-6 space-y-1.5 text-xs text-zinc-400">
            <li>Ads do not load or register impressions off-screen;</li>
            <li>Ad containers require at least 50% viewport visibility via <code>IntersectionObserver</code> before any ad tag initializes;</li>
            <li>Carousels rotate strictly on deliberate user action (zero automated autoplay refresh).</li>
          </ul>
        </section>

        {/* Section 9: Data Security & Multi-Tier Retention */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold font-outfit text-white flex items-center gap-2.5">
            <span className="w-2 h-6 rounded-full bg-yellow-400 inline-block"></span>
            9. Security &amp; Retention Safeguards
          </h2>
          <ul className="list-disc pl-6 space-y-1.5 text-sm">
            <li><strong>Strict TTL Eviction:</strong> Cached player statistics in DynamoDB and Redis expire automatically within a 15-minute to 24-hour window.</li>
            <li><strong>Transport Encryption:</strong> All communications between client, Spring Boot backend, Steam, and cloud databases are enforced over HTTPS / TLS 1.3.</li>
            <li><strong>Immediate Destruction:</strong> Clicking &quot;Disconnect&quot; immediately invalidates your session cookie on your local device.</li>
          </ul>
        </section>

        {/* Section 10: Contact Information */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold font-outfit text-white flex items-center gap-2.5">
            <span className="w-2 h-6 rounded-full bg-orange-500 inline-block"></span>
            10. Privacy Inquiries &amp; Data Protection Officer Contact
          </h2>
          <p className="leading-relaxed text-sm">
            For questions about this policy, data subject requests, or CCPA/GDPR inquiries:
          </p>
          <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-4 text-xs font-mono text-zinc-400 space-y-1">
            <p className="text-white font-bold font-sans">100PercentGuides Privacy Team</p>
            <p>Email: <span className="text-orange-400">privacy@100percentguides.com</span></p>
            <p>Response Timeframe: Within 30 calendar days</p>
            <p>Jurisdiction: Sydney, NSW, Australia &bull; Global Operations</p>
          </div>
        </section>

        {/* Navigation */}
        <div className="pt-8 border-t border-zinc-900 flex justify-between items-center text-sm">
          <Link href="/" className="text-orange-400 hover:text-orange-300 font-semibold transition-colors">
            &larr; Back to Home
          </Link>
          <Link href="/terms" className="text-zinc-400 hover:text-white transition-colors">
            View Terms of Service &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
