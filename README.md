# 100PercentGuides

## Overview
A high-performance, modern mobile-first video game achievement and 100% completion guide platform.

## Architecture
- **Backend:** Java Spring Boot
- **Frontend:** Next.js
- **Database:** AWS DynamoDB
- **Cache:** Redis

## Features
- **Database-Driven Collectible Guides & Map Framework:**
  - Guides, steps, multi-map definitions, and pin coordinates stored dynamically in AWS DynamoDB (`GameGuides` table) with Redis L1 caching.
  - In-App Guide Creator with multi-map image imports, real-time drag-and-drop / click-to-pin canvas (no coordinate guessing), achievement attachment, and integrated step-by-step checklist maker.
  - Standalone guide routes (`/game/[id]/[guideSlug]`) with multi-map switching, completable achievement badges, interactive vector/raster maps, and live step progress tracking.
- **Interactive Vector Game Maps & Step-by-Step Guides:** Standalone interactive guide pages with high-performance vector SVG maps, numbered location pins, and region-grouped step checklists.
- **Dynamic 100% Game Completion Guides:** Detailed breakdown of game achievements and playtime.
- **Steam Login & Live Achievement Auto-Checking:**
  - Official Valve OpenID 2.0 authentication and manual Steam ID / vanity URL linking.
  - Automatic achievement auto-checking matching player progress against game achievements via `steamApiName`.
  - Live progress dashboard with interactive progress bar, completed counts, unlock dates, and dedicated filter tabs (All, Completed, To-Do, Public, Hidden/Secret).
  - Rate-limit resilient multi-tier caching (Redis L1 + DynamoDB L2) protecting against Valve rate limits.
- **Achievement Rarity Tiering & Hidden Achievement Support:** Dynamic colored rarity indicators (≤5% Gold, ≤50% Silver, >50% Bronze) paired with Steam Web API schema enrichment to uncover secret/storyline achievements intentionally omitted by RAWG, complete with spoiler controls and category filter tabs (All, Public, Hidden/Secret).
- **Affiliate & Store Integration:** Automatic localized store/affiliate links with configurable tracking tags and cookies.
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
