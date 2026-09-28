# 100PercentGuides

## Overview
A high-performance, modern mobile-first video game achievement and 100% completion guide platform.

## Architecture
- **Backend:** Java Spring Boot
- **Frontend:** Next.js
- **Database:** AWS DynamoDB
- **Cache:** Redis

## Features
- **Per-Achievement Step-by-Step Checklists & Interactive Map Drawers:**
  - Checklists and interactive maps live directly under their respective achievements with dedicated slide-over drawers / full modals.
  - Direct '+ Add Checklist' and 'Edit Checklist' actions on each achievement card pre-linked to that achievement.
  - Dedicated slide-over drawer featuring step-by-step instructions, interactive multi-layer raster or vector SVG maps, numbered location pins, screenshots, hints, and local progress tracking.
  - Bulk JSON import in the browser UI and bulk seeding CLI script (`python3 scripts/seed_guide.py --dir <directory>`).
  - DynamoDB persistence (`GameGuides` table) and multi-tier Redis caching for all checklist steps and location pins.
- **Dynamic 100% Game Completion Guides:** Detailed breakdown of game achievements and playtime.
- **Steam Login & Live Achievement Auto-Checking:**
  - Official Valve OpenID 2.0 authentication and manual Steam ID / vanity URL linking.
  - Automatic achievement auto-checking matching player progress against game achievements via `steamApiName`.
  - Live progress dashboard with interactive progress bar, completed counts, unlock dates, and dedicated filter tabs (All, Completed, To-Do, Public, Hidden/Secret).
  - Rate-limit resilient multi-tier caching (Redis L1 + DynamoDB L2) protecting against Valve rate limits.
- **Achievement Rarity Tiering & Hidden Achievement Support:** Dynamic colored rarity indicators (≤5% Gold, ≤50% Silver, >50% Bronze) paired with Steam Web API schema enrichment to uncover secret/storyline achievements intentionally omitted by RAWG, complete with spoiler controls, strict Unicode whitespace deduplication (`\u00A0`), category filter tabs (All, Public, Hidden/Secret), and Steam as exclusive source of truth for exact Steam schema counts (e.g. 77/77 for GTA V).
- **Affiliate & Store Integration:** Automatic localized store/affiliate links with configurable tracking tags and cookies.
- **Google AdSense Begin-to-Render Compliant Ad Carousel:**
  - Infinitely looping carousel (`loop: true`) with interactive navigation dots, swipe gestures, and slide controls.
  - Strict **User-Action-Only** policy (zero autoplay/automated rotation timers) preventing AdSense automated refresh penalties.
  - Full **Begin-to-Render Standard** adherence (2027 global standard): Dual-gated activation (`IntersectionObserver` at >=50% viewport visibility + user-selected active slide check) ensures impressions are only counted when ads finish loading and visually render.
  - Zero Cumulative Layout Shift (CLS) with fixed reserved dimensions (`728x90`).
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
