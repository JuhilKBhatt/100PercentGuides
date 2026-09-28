import React from "react";
import Link from "next/link";
import { FileText, ShieldAlert, Scale, ExternalLink, HelpCircle, Copyright, UserX, AlertOctagon } from "lucide-react";

export const metadata = {
  title: "Terms of Service | 100PercentGuides",
  description: "Global Terms of Service for 100PercentGuides, including DMCA Copyright Policy, Australian Consumer Law (ACL), and US FTC Disclosures.",
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-black text-zinc-300 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-12">
        {/* Header */}
        <div className="space-y-4 border-b border-zinc-900 pb-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-semibold uppercase tracking-wider">
              <Scale size={14} />
              International Terms &amp; Compliance
            </span>
            <span className="text-xs text-zinc-500 font-mono border border-zinc-800 bg-zinc-950 px-2 py-0.5 rounded">
              DMCA 17 U.S.C. &sect; 512 &bull; ACL &bull; FTC 16 CFR &sect; 255 &bull; GDPR
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold font-outfit text-white tracking-tight">
            Terms of Service
          </h1>
          <p className="text-sm text-zinc-400">
            Last Updated: 28 September 2026 &bull; Legally binding agreement between you and 100PercentGuides.
          </p>
        </div>

        {/* Section 1: Agreement to Terms & Eligibility */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold font-outfit text-white flex items-center gap-2.5">
            <span className="w-2 h-6 rounded-full bg-orange-500 inline-block"></span>
            1. Agreement to Terms &amp; Age Eligibility (COPPA)
          </h2>
          <p className="leading-relaxed">
            By accessing or using 100PercentGuides (&quot;the Service&quot;), you confirm that you have read, understood, and agreed to these Terms of Service and our Privacy Policy.
          </p>
          <div className="p-4 bg-zinc-950 border border-zinc-900 rounded-xl space-y-2 text-sm">
            <div className="flex items-center gap-2 text-white font-semibold">
              <UserX size={16} className="text-amber-400" />
              <span>Age Requirement (13+ / 16+ in EEA):</span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              You must be at least <strong>13 years of age</strong> (or <strong>16 years of age</strong> in the European Economic Area or UK) to use this Service or connect your Steam profile. If you are under the legal age of majority in your jurisdiction, you represent that your parent or legal guardian has reviewed and consented to these Terms.
            </p>
          </div>
        </section>

        {/* Section 2: Informational Purpose & Attainability Notice */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold font-outfit text-white flex items-center gap-2.5">
            <span className="w-2 h-6 rounded-full bg-amber-500 inline-block"></span>
            2. Informational Walkthroughs &amp; Achievement Attainability
          </h2>
          <p className="leading-relaxed">
            100PercentGuides provides curated collectible coordinates, interactive map layers, and step-by-step roadmaps designed to help players pursue 100% completion in video games.
          </p>
          <div className="p-4 rounded-xl bg-zinc-950 border border-amber-500/30 text-zinc-300 text-sm space-y-2">
            <h3 className="font-semibold text-amber-400 flex items-center gap-2">
              <ShieldAlert size={16} />
              Important Attainability Disclaimer
            </h3>
            <p className="text-xs leading-relaxed text-zinc-400">
              While our guides are meticulously researched and tested, achievement unlockability is ultimately determined by third-party game developers, publishers, and platform operators. Certain achievements may become unobtainable over time due to discontinued multiplayer servers, unpatched software glitches, platform updates, or delisting. Guides are provided for informational and educational purposes and do not constitute an absolute guarantee against third-party game software defects.
            </p>
          </div>
        </section>

        {/* Section 3: DMCA Copyright Policy & Designated Agent */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold font-outfit text-white flex items-center gap-2.5">
            <span className="w-2 h-6 rounded-full bg-yellow-400 inline-block"></span>
            3. Copyright Policy &amp; DMCA Takedown Notice (17 U.S.C. &sect; 512)
          </h2>
          <p className="leading-relaxed">
            100PercentGuides respects the intellectual property rights of game publishers, artists, and creators. In accordance with the <strong>Digital Millennium Copyright Act of 1998 (17 U.S.C. &sect; 512)</strong> and international copyright treaties, we respond expeditiously to notices of alleged copyright infringement.
          </p>
          <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-5 space-y-3 text-sm">
            <h3 className="font-bold text-white flex items-center gap-2">
              <Copyright size={16} className="text-orange-400" />
              Filing a DMCA Takedown Notice
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              If you believe that your copyrighted work has been copied or displayed on our platform in a manner that constitutes copyright infringement, please submit a written notification containing:
            </p>
            <ol className="list-decimal pl-5 space-y-1 text-xs text-zinc-400">
              <li>A physical or electronic signature of a person authorized to act on behalf of the copyright owner;</li>
              <li>Identification of the copyrighted work claimed to have been infringed (e.g. game title, artwork, or asset);</li>
              <li>Identification of the material claimed to be infringing, including the specific URL or location on 100PercentGuides;</li>
              <li>Your contact information (full name, address, telephone number, and email address);</li>
              <li>A statement that you have a good faith belief that use of the material is not authorized by the copyright owner, its agent, or the law;</li>
              <li>A statement, under penalty of perjury, that the information in the notification is accurate and that you are authorized to act on the owner&apos;s behalf.</li>
            </ol>
            <div className="pt-2 text-xs font-mono text-orange-400 border-t border-zinc-900">
              Designated DMCA Agent Email: <span className="text-white underline">dmca@100percentguides.com</span>
            </div>
          </div>
        </section>

        {/* Section 4: Consumer Guarantees & Non-Exclusion (ACL & Global) */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold font-outfit text-white flex items-center gap-2.5">
            <span className="w-2 h-6 rounded-full bg-orange-500 inline-block"></span>
            4. Statutory Consumer Guarantees (ACL &amp; International)
          </h2>
          <p className="leading-relaxed">
            Under Schedule 2 of the Australian <em>Competition and Consumer Act 2010</em> (Cth) and equivalent international consumer protection legislation (including EU Consumer Rights Directives and UK Consumer Rights Act 2015), consumers possess non-excludable statutory rights and warranties.
          </p>
          <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-4 text-xs text-zinc-400 leading-relaxed">
            <strong className="text-white">Statutory Non-Exclusion Clause:</strong> Nothing in these Terms purports to exclude, limit, or modify any statutory consumer guarantee, warranty, or remedy provided by law that cannot be lawfully excluded. To the extent permitted by law, our liability is strictly limited to the resupply of the digital information or services.
          </div>
        </section>

        {/* Section 5: Commercial Affiliate Links (US FTC & ACCC Standards) */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold font-outfit text-white flex items-center gap-2.5">
            <span className="w-2 h-6 rounded-full bg-amber-500 inline-block"></span>
            5. Commercial Affiliate Links (FTC &amp; ACCC Compliance)
          </h2>
          <p className="leading-relaxed text-sm">
            In compliance with the <strong>United States Federal Trade Commission (FTC) Guides Concerning the Use of Endorsements (16 CFR Part 255)</strong>, the UK Competition and Markets Authority (CMA), and the Australian Consumer Law:
          </p>
          <ul className="list-disc pl-6 space-y-1.5 text-xs text-zinc-400">
            <li>100PercentGuides participates in affiliate programs and may earn a financial commission when you purchase games through links on our site (such as &quot;Buy Game Now&quot;), at no extra cost to you.</li>
            <li>All product orders, payments, refunds, and digital key redemptions are processed entirely by external third-party merchant platforms (Steam, official authorized stores). We are not the merchant of record and do not store payment details.</li>
          </ul>
        </section>

        {/* Section 6: Trademarks & Fair Use */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold font-outfit text-white flex items-center gap-2.5">
            <span className="w-2 h-6 rounded-full bg-yellow-400 inline-block"></span>
            6. Trademarks &amp; Nominative Fair Use
          </h2>
          <p className="leading-relaxed text-sm text-zinc-400">
            Steam, the Steam logo, and Valve are registered trademarks of Valve Corporation in the U.S. and other countries. All game titles, character names, publisher trademarks, cover art, and achievement icons displayed on 100PercentGuides are the property of their respective copyright and trademark owners. They are referenced strictly under nominative fair use for identification, commentary, and educational guide purposes. 100PercentGuides is not affiliated with, endorsed by, or sponsored by Valve Corporation or any game publisher unless explicitly stated.
          </p>
        </section>

        {/* Section 7: Limitation of Liability & Governing Law */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold font-outfit text-white flex items-center gap-2.5">
            <span className="w-2 h-6 rounded-full bg-orange-500 inline-block"></span>
            7. Limitation of Liability &amp; Governing Law
          </h2>
          <p className="leading-relaxed text-sm">
            To the maximum extent permitted by applicable law, 100PercentGuides shall not be liable for any direct, indirect, incidental, or consequential damages resulting from your use of or reliance on any guide, or the loss of in-game progress.
          </p>
          <p className="leading-relaxed text-sm text-zinc-400">
            These Terms are governed by the laws of Australia and the State of New South Wales, without regard to conflict of laws principles. However, nothing in this section deprives consumers of the mandatory protection granted to them by the laws of their country of habitual residence (e.g., EEA, UK, or US state consumer laws).
          </p>
        </section>

        {/* Navigation */}
        <div className="pt-8 border-t border-zinc-900 flex justify-between items-center text-sm">
          <Link href="/" className="text-orange-400 hover:text-orange-300 font-semibold transition-colors">
            &larr; Back to Home
          </Link>
          <Link href="/privacy" className="text-zinc-400 hover:text-white transition-colors">
            View Privacy Policy &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
