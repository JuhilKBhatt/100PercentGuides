# 100PercentGuides

## Overview
A high-performance, modern mobile-first video game achievement and 100% completion guide platform.

## Architecture
- **Backend:** Java Spring Boot
- **Frontend:** Next.js
- **Database:** AWS DynamoDB
- **Cache:** Redis

## Features
- **Per-Achievement Step-by-Step Checklists & Conditional Map UI:**
  - Clean separation: If an achievement checklist has no map image or vectors, the map container, controls, and pin badges are automatically hidden, presenting a focused step-by-step checklist.
  - Checklists and interactive maps live directly under their respective achievements with dedicated slide-over drawers / full modals.
  - Direct '+ Add Checklist' and 'Edit Checklist' actions on each achievement card pre-linked to that achievement.
  - Dedicated slide-over drawer featuring step-by-step instructions, interactive multi-layer raster or vector SVG maps, numbered location pins, screenshots, hints, and local progress tracking.
  - Bulk JSON import in the browser UI and bulk seeding CLI script (`python3 scripts/seed_guide.py --dir <directory>`).
  - DynamoDB persistence (`GameGuides` table) and multi-tier Redis caching for all checklist steps and location pins.
- **Interactive Global Search with Dynamic Typing & Navigation Loading Animations:**
  - **Debounced Live Typeahead:** Search games with 350ms debouncing, in-memory client caching, and AbortController race-condition cancellation.
  - **Typing Shimmer & Scanning Laser Bar:** Animated input glow, running laser progress line along the bottom border of the input container, and multi-row skeleton shimmer preview in the dropdown while querying the database.
  - **Result-Click Navigation Animations:** Immediate visual feedback when selecting a game—active glowing card with thumbnail spinner, sweeping top-of-screen animated laser progress beam, and a floating frosted status pill indicating roadmap preparation while Next.js routes to the game page.
- **Dynamic 100% Game Completion Guides:** Detailed breakdown of game achievements and playtime.
- **Steam Login & Live Achievement Auto-Checking:**
  - Official Valve OpenID 2.0 authentication and manual Steam ID / vanity URL linking.
  - Automatic achievement auto-checking matching player progress against game achievements via `steamApiName`.
  - Live progress dashboard with interactive progress bar, completed counts, unlock dates, and dedicated filter tabs (All, Completed, To-Do, Public, Hidden/Secret).
  - Rate-limit resilient multi-tier caching (Redis L1 + DynamoDB L2) protecting against Valve rate limits.
- **Achievement Rarity Tiering & Hidden Achievement Support:** Dynamic colored rarity indicators (≤5% Gold, ≤50% Silver, >50% Bronze) paired with Steam Web API schema enrichment to uncover secret/storyline achievements intentionally omitted by RAWG, complete with spoiler controls, strict Unicode whitespace deduplication (`\u00A0`), category filter tabs (All, Public, Hidden/Secret), and Steam as exclusive source of truth for exact Steam schema counts (e.g. 77/77 for GTA V).
- **Global Digital Compliance & Regulatory Framework (GDPR, CCPA/CPRA, DMCA, COPPA, ACL, APPs):**
  - **EU/UK GDPR & ePrivacy:** Granular cookie preferences banner (`CookieBanner.tsx`) with opt-in "Accept All" and "Essential Only" controls, Art. 6 legal bases, and Art. 15-22 data subject rights (Erasure, Portability).
  - **US Privacy & Safe Harbor:** CCPA/CPRA "Notice at Collection" and "Do Not Sell/Share My Info" clauses, 17 U.S.C. § 512 DMCA Safe Harbor designated agent, and US FTC 16 CFR Part 255 commercial affiliate disclosures.
  - **Minor Protection:** Standard COPPA & GDPR-K 13+/16+ age restriction policies.
  - **Australia:** Full compliance with the *Privacy Act 1988* (Cth), APPs 1-13, and *Australian Consumer Law* (ACL).
  - Full adherence to the *Privacy Act 1988* (Cth) and Australian Privacy Principles (APPs 1, 3, 5, 8, 11, 12, 13) with dedicated `/privacy` policy, APP 5 Steam collection notices, and overseas transfer disclosures.
  - Full adherence to the *Australian Consumer Law* (ACL) with dedicated `/terms`, non-excludable statutory consumer guarantee clauses (s 64), transparent commercial affiliate disclosures on `BuyButton`, and external merchant boundaries.
  - OAIC-compliant dismissible cookie & advertising disclosure banner (`CookieBanner.tsx`) and global compliance footer (`Footer.tsx`).
- **Affiliate & Store Integration:** Automatic localized store/affiliate links with configurable tracking tags and cookies.
- **Google AdSense Begin-to-Render Compliant Ad Carousel & Home Ad Cards:**
  - Dual responsive home page ad cards (`AdCard.tsx`) designed for standard Medium Rectangle (300×250 / responsive) placements, integrated seamlessly into the dark glassmorphic UI.
  - Infinitely looping carousel (`loop: true`) with interactive navigation dots, swipe gestures, and slide controls.
  - Strict **User-Action-Only** policy (zero autoplay/automated rotation timers) preventing AdSense automated refresh penalties.
  - Full **Begin-to-Render Standard** adherence (2027 global standard): Dual-gated activation (`IntersectionObserver` at >=50% viewport visibility + user-selected active slide check) ensures impressions are only counted when ads finish loading and visually render.
  - Zero Cumulative Layout Shift (CLS) with fixed reserved dimensions (`728x90`).
- **AI Auto-Pilot Seeder & Guide Generator (Option 3):**
  - Powered by a **Multi-Model AI Pool** (`gemini-3.5-flash-lite`, `gemini-3.1-flash-lite`, `gemini-flash-lite-latest`, `gemma-4-31b-it`) utilizing independent quota buckets to multiply throughput from 15 RPM to ~45+ RPM with zero-button page-load generation and automatic failover.
  - Bulk CLI script `scripts/seed_game_ai.py` automates whole games with strict in-game milestone verification and automatic 4.2-second rate-limit pauses.
  - Fully automated zero-button page-load AI generation: loading any game page automatically begins generating verified checklists for unguided achievements in the background at 14 RPM safe speed, showing live *"Generating checklist... Please wait"* states and immediately transitioning into interactive checklists.
- **Multi-tiered 24-Hour Cache:** Redis in-memory L1 cache and AWS DynamoDB persistent L2 cache.

## Setup Instructions

1. **Configure Secrets**
   Enter your API keys and configuration values in the `.env.dev` and `.env.prod` files located inside the `secrets/` directory. (Note: These files are ignored by git to protect your credentials).

2. **Run Development Environment**
   Start the services using Docker Compose:
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
   ```

3. **Access the Applications**
   - Frontend: `http://localhost:3000`
   - Backend API: `http://localhost:8080`
   - Redis: `localhost:6379`
   - DynamoDB Local: `http://localhost:8000`

## Structure
- `/frontend`: Next.js application
- `/backend`: Spring Boot application
- `/secrets`: Configuration and keys
