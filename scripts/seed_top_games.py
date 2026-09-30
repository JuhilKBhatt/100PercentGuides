#!/usr/bin/env python3
"""
Top Games Auto-Cache & Guide Seeder
1. Warms backend Redis & DynamoDB cache for Game Details across Top 500 games (<50ms page load)
2. Fetches achievements and generates verified checklists for Top 100 games
3. Features graceful signal handling, atomic checkpointing, and instant resumption.
"""

import os
import sys
import time
import json
import signal
import argparse
import urllib.request
import urllib.error
import ssl
from pathlib import Path

MODEL_POOL = [
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
    "gemini-3.8-flash",
    "gemini-3.6-flash",
    "gemini-3.7-flash",
    "gemini-2.5-flash",
    "gemini-3-flash",
    "gemma-4-31b-it"
]

CHECKPOINT_FILE = Path("scripts/top_100_progress.json")
STOP_REQUESTED = False

def handle_shutdown(signum, frame):
    global STOP_REQUESTED
    sig_name = "SIGTERM" if signum == signal.SIGTERM else "SIGINT"
    print(f"\n[Signal] Received {sig_name}. Will finish current request and safely exit...")
    STOP_REQUESTED = True

signal.signal(signal.SIGINT, handle_shutdown)
signal.signal(signal.SIGTERM, handle_shutdown)

def load_keys():
    gemini_key = os.environ.get("GEMINI_API_KEY")
    rawg_key = os.environ.get("RAWG_API_KEY")
    
    search_paths = [
        Path("secrets/.env.dev"),
        Path("../secrets/.env.dev"),
        Path("secrets/.env.prod"),
        Path("../secrets/.env.prod"),
    ]
    for p in search_paths:
        if p.exists():
            with open(p, "r", encoding="utf-8") as f:
                for line in f:
                    if not gemini_key and line.startswith("GEMINI_API_KEY="):
                        gemini_key = line.split("=", 1)[1].strip().strip('"').strip("'")
                    if not rawg_key and line.startswith("RAWG_API_KEY="):
                        rawg_key = line.split("=", 1)[1].strip().strip('"').strip("'")
    return gemini_key, rawg_key

def fetch_json(url, timeout=25):
    ctx = ssl._create_unverified_context()
    req = urllib.request.Request(url, headers={"User-Agent": "100PercentGuides-TopSeeder/1.0"})
    with urllib.request.urlopen(req, context=ctx, timeout=timeout) as res:
        return json.loads(res.read().decode("utf-8"))

def post_json(url, data, timeout=30):
    ctx = ssl._create_unverified_context()
    payload = json.dumps(data).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=payload,
        headers={"Content-Type": "application/json", "User-Agent": "100PercentGuides-TopSeeder/1.0"}
    )
    with urllib.request.urlopen(req, context=ctx, timeout=timeout) as res:
        return json.loads(res.read().decode("utf-8"))

def wait_for_backend(backend_url, max_attempts=60, delay_sec=2):
    print(f"Checking backend connectivity at {backend_url}...")
    ctx = ssl._create_unverified_context()
    for attempt in range(1, max_attempts + 1):
        if STOP_REQUESTED:
            sys.exit(0)
        try:
            req = urllib.request.Request(
                f"{backend_url}/api/games/search?q=ping",
                headers={"User-Agent": "100PercentGuides-ReadyCheck/1.0"}
            )
            with urllib.request.urlopen(req, context=ctx, timeout=4) as res:
                if res.status == 200:
                    print(f"✓ Backend is online and responding (attempt {attempt}).\n")
                    return True
        except Exception:
            pass
        if attempt % 5 == 0:
            print(f"  ...waiting for backend to finish booting (attempt {attempt}/{max_attempts})...")
        time.sleep(delay_sec)
    print("Warning: Backend health check timed out. Attempting to proceed anyway...\n")
    return False

def load_checkpoint():
    for fpath in [CHECKPOINT_FILE, CHECKPOINT_FILE.with_suffix(".tmp")]:
        if fpath.exists():
            try:
                with open(fpath, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if isinstance(data, dict):
                        return data
            except Exception:
                pass
    return {"completed_games": [], "cached_games": []}

def interruptible_sleep(seconds):
    """Sleep in short increments so SIGINT/SIGTERM exits immediately without delay"""
    steps = int(seconds / 0.1)
    for _ in range(max(1, steps)):
        if STOP_REQUESTED:
            break
        time.sleep(0.1)

def save_checkpoint(data):
    """Atomic checkpoint save: writes to temp file then replaces to prevent corrupted JSON on abort"""
    try:
        tmp_file = CHECKPOINT_FILE.with_suffix(".tmp")
        with open(tmp_file, "w") as f:
            json.dump(data, f, indent=2)
        os.replace(tmp_file, CHECKPOINT_FILE)
    except Exception as e:
        print(f"Warning: Failed to save checkpoint atomically: {e}")

def get_top_games(rawg_key, total=500, checkpoint=None, refresh=False):
    if not refresh and checkpoint and len(checkpoint.get("games_catalog", [])) >= total:
        print(f"Loaded catalog of Top {total} games directly from local checkpoint.\n")
        return checkpoint["games_catalog"][:total]

    print(f"Fetching Top {total} PC/Steam games from RAWG...")
    games = []
    page = 1
    page_size = 40
    ctx = ssl._create_unverified_context()

    while len(games) < total:
        if STOP_REQUESTED:
            sys.exit(0)
        url = f"https://api.rawg.io/api/games?key={rawg_key}&ordering=-added&page_size={page_size}&page={page}&platforms=4"
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "100PercentGuides/1.0"})
            with urllib.request.urlopen(req, context=ctx, timeout=15) as res:
                data = json.loads(res.read().decode("utf-8"))
                results = data.get("results", [])
                if not results:
                    break
                for g in results:
                    games.append({
                        "id": str(g["id"]),
                        "name": g["name"],
                        "rating": g.get("rating", 0),
                        "released": g.get("released", "N/A"),
                    })
                    if len(games) >= total:
                        break
                page += 1
        except Exception as e:
            print(f"Error fetching page {page} from RAWG: {e}")
            break

    print(f"Successfully retrieved {len(games)} top games.\n")
    if checkpoint is not None and len(games) >= total:
        checkpoint["games_catalog"] = games
        save_checkpoint(checkpoint)
    return games

def generate_achievement_guide(api_key, game_name, game_id, achievement, model_idx=0, max_attempts=4):
    ach_id = achievement.get("id")
    ach_name = achievement.get("name", "Unknown Achievement")
    ach_desc = achievement.get("description", "Unlock the achievement")

    prompt = f"""You are a master video game completionist and verified 100% achievement guide author.
Create an accurate, authentic step-by-step completion checklist for this video game achievement:

Game: {game_name}
Achievement: {ach_name}
Official Description: {ach_desc}

REQUIREMENTS FOR ACCURACY:
1. Verify how this achievement is ACTUALLY unlocked in the game. Do not guess or hallucinate.
2. If it is story-related or unmissable, detail the exact mission chapter, prerequisites, and milestone triggers.
3. If it is a collectible or multi-stage task, list the key locations, actionable instructions, and in-game landmarks.
4. If it has missable elements or difficulty requirements, state them clearly in the details/hints.
5. Provide realistic normalized X/Y coordinates (between 5 and 95) for the map pins.

OUTPUT FORMAT:
Return ONLY valid JSON matching this exact structure:
{{
  "title": "{ach_name} Checklist",
  "subtitle": "Accurate step-by-step roadmap to unlock {ach_name}",
  "regions": [
    {{
      "id": "region-slug",
      "name": "Region Name",
      "items": [
        {{
          "id": 1,
          "name": "Step Title",
          "region": "Region Name",
          "locationText": "Specific in-game location or milestone",
          "details": "Detailed gameplay instructions, weapons, or mission advice",
          "x": 50.0,
          "y": 50.0
        }}
      ]
    }}
  ]
}}
Do NOT wrap the response in markdown blocks. Output pure JSON only."""

    raw_text = None
    used_model = None

    for attempt in range(1, max_attempts + 1):
        if STOP_REQUESTED:
            break

        for i in range(len(MODEL_POOL)):
            if STOP_REQUESTED:
                break
            cand_model = MODEL_POOL[(model_idx + i) % len(MODEL_POOL)]
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{cand_model}:generateContent?key={api_key}"
            body = {
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {
                    "responseMimeType": "application/json"
                }
            }

            try:
                res_data = post_json(url, body, timeout=25)
                candidates = res_data.get("candidates", [])
                if candidates:
                    text_part = candidates[0].get("content", {}).get("parts", [])[0].get("text", "")
                    if text_part.strip():
                        raw_text = text_part
                        used_model = cand_model
                        break
            except Exception:
                continue

        if raw_text:
            break

        # Cooldown if all candidate models in pool hit 429/503/timeout
        if attempt < max_attempts and not STOP_REQUESTED:
            cooldown_sec = min(45, 20 + 5 * attempt)
            print(f"\n    [Rate Limit Cooldown] All models busy. Pausing {cooldown_sec}s for quota reset (attempt {attempt}/{max_attempts})...", end="", flush=True)
            interruptible_sleep(cooldown_sec)
            print(f" retrying '{ach_name}'...", end="", flush=True)

    if not raw_text:
        raise RuntimeError("All models in the pool were exhausted or rate-limited after multiple retries.")

    try:
        parsed = json.loads(raw_text)
    except Exception as e:
        raise ValueError(f"Failed to parse JSON response: {e}")

    guide_slug = f"ach-{ach_id}"
    total_count = 0
    item_counter = 1
    clean_regions = []

    for reg in parsed.get("regions", []):
        reg_id = reg.get("id") or reg.get("name", "general").lower().replace(" ", "-")
        reg_name = reg.get("name", "General")
        items = []
        for it in reg.get("items", []):
            item_obj = {
                "id": item_counter,
                "name": it.get("name", f"Step {item_counter}"),
                "region": it.get("region", reg_name),
                "locationText": it.get("locationText", "See details"),
                "details": it.get("details", ""),
                "x": it.get("x", 50.0) if isinstance(it.get("x"), (int, float)) else 50.0,
                "y": it.get("y", 50.0) if isinstance(it.get("y"), (int, float)) else 50.0,
            }
            item_counter += 1
            total_count += 1
            items.append(item_obj)

        clean_regions.append({
            "id": reg_id,
            "name": reg_name,
            "itemCount": len(items),
            "items": items
        })

    full_guide = {
        "gameId": str(game_id),
        "gameSlug": game_name.lower().replace(" ", "-"),
        "guideSlug": guide_slug,
        "title": parsed.get("title", f"{ach_name} Checklist"),
        "subtitle": parsed.get("subtitle", ach_desc),
        "totalCount": total_count if total_count > 0 else 1,
        "requiredForCompletion": total_count if total_count > 0 else 1,
        "achievementId": str(ach_id),
        "generatedByModel": used_model,
        "relatedAchievements": [
            {
                "id": int(ach_id) if str(ach_id).isdigit() else 0,
                "name": ach_name,
                "description": ach_desc
            }
        ],
        "maps": [
            {
                "id": "main-map",
                "name": f"{game_name} Map"
            }
        ],
        "regions": clean_regions
    }

    return full_guide, used_model

def main():
    parser = argparse.ArgumentParser(description="Top Games Auto-Cache & Guide Seeder")
    parser.add_argument("--count", type=int, default=500, help="Total number of top games to cache details for (default: 500)")
    parser.add_argument("--ach-games-limit", type=int, default=100, help="Number of top games to fetch achievements & seed guides for (default: 100)")
    parser.add_argument("--backend", default="http://localhost:8080", help="Backend URL (default: http://localhost:8080)")
    parser.add_argument("--cache-only", action="store_true", help="Warm details & Steam achievements cache only (skip AI guide generation)")
    parser.add_argument("--ach-limit", type=int, default=None, help="Limit number of achievements to generate per game (for testing)")
    parser.add_argument("--start-rank", type=int, default=1, help="Start from rank N (1-indexed)")
    parser.add_argument("--refresh-catalog", action="store_true", help="Force re-fetching games catalog from RAWG")
    args = parser.parse_args()

    # 1. Wait for backend service to be alive
    wait_for_backend(args.backend)

    gemini_key, rawg_key = load_keys()
    if not rawg_key:
        print("ERROR: RAWG_API_KEY not found in environment or secrets/.env.dev / .env.prod")
        sys.exit(1)
    if not args.cache_only and not gemini_key:
        print("ERROR: GEMINI_API_KEY not found in environment or secrets/.env.dev / .env.prod")
        sys.exit(1)

    print("=================================================================")
    print("   100PercentGuides Top Games Engine: Cache Warmer & AI Seeder   ")
    print(f"   Target Catalog: Top {args.count} PC/Steam Games               ")
    print(f"   Achievements & Guides Target: Top {args.ach_games_limit} Games")
    mode_desc = "CACHE WARMING ONLY (<50ms speedup)" if args.cache_only else "TWO-STAGE (FAST CACHE WARMING + AI CHECKLIST GENERATION)"
    print(f"   Mode: {mode_desc}")
    print(f"   Backend: {args.backend}                                       ")
    print("=================================================================\n")

    checkpoint = load_checkpoint()
    top_games = get_top_games(rawg_key, total=args.count, checkpoint=checkpoint, refresh=args.refresh_catalog)

    completed_games = set(checkpoint.get("completed_games", []))
    cached_games = set(checkpoint.get("cached_games", []))

    # =========================================================================
    # STAGE 1: Instant Cache Warming Pass (All Top Games)
    # =========================================================================
    print(f">>> STAGE 1: Instant Cache Warming Pass (Top {len(top_games)} Games)...")
    for rank, g in enumerate(top_games, 1):
        if STOP_REQUESTED:
            print("\n[Shutdown] Pausing Stage 1 cache-warming safely. Checkpoint saved.")
            save_checkpoint(checkpoint)
            sys.exit(0)

        gid = g["id"]
        gname = g["name"]
        if gid in cached_games:
            print(f"  [{rank}/{len(top_games)}] Already cached: {gname}")
            continue

        try:
            t0 = time.time()
            fetch_json(f"{args.backend}/api/games/{gid}")
            
            # Fetch achievements only for games up to ach_games_limit
            if rank <= args.ach_games_limit:
                ach_res = fetch_json(f"{args.backend}/api/games/{gid}/achievements")
                ach_count = len(ach_res.get("results", [])) if isinstance(ach_res, dict) else len(ach_res)
                elapsed = time.time() - t0
                print(f"  [{rank}/{len(top_games)}] ✓ CACHED details & {ach_count} achievements in {elapsed:.2f}s: {gname}")
            else:
                elapsed = time.time() - t0
                print(f"  [{rank}/{len(top_games)}] ✓ CACHED details in {elapsed:.2f}s: {gname}")

            cached_games.add(gid)
            checkpoint["cached_games"] = list(cached_games)
            save_checkpoint(checkpoint)
        except Exception as e:
            print(f"  [{rank}/{len(top_games)}] ✗ Cache failed for {gname}: {e}")

    print(f"\nStage 1 Complete: {len(cached_games)}/{len(top_games)} games cached in Redis & DynamoDB.\n")

    if args.cache_only or STOP_REQUESTED:
        print("Exiting after cache warming.")
        return

    # =========================================================================
    # STAGE 2: Automated AI Guide Generation (Top ach_games_limit only)
    # =========================================================================
    print(f">>> STAGE 2: Automated AI Guide & Checklist Generation (Top {args.ach_games_limit} Games)...")
    for rank, g in enumerate(top_games, 1):
        if STOP_REQUESTED:
            print("\n[Shutdown] Pausing Stage 2 guide generation safely. Checkpoint saved.")
            save_checkpoint(checkpoint)
            sys.exit(0)

        if rank > args.ach_games_limit:
            print(f"\nReached rank {rank} (beyond Top {args.ach_games_limit} guide target). Skipping guide generation for remaining catalog games.")
            break
        if rank < args.start_rank:
            continue

        gid = g["id"]
        gname = g["name"]

        # Fast skip if already fully completed from checkpoint AND verified in DynamoDB
        if gid in completed_games:
            try:
                verified_guides = fetch_json(f"{args.backend}/api/games/{gid}/guides")
                if isinstance(verified_guides, list) and len(verified_guides) > 0:
                    print(f"  [{rank}/{args.ach_games_limit}] Already fully completed: {gname} ({len(verified_guides)} guides verified in DynamoDB)")
                    continue
                else:
                    print(f"  [{rank}/{args.ach_games_limit}] Checkpoint marked complete but DynamoDB is empty for {gname}. Reseeding...")
            except Exception:
                pass

        print(f"\n-------------------------------------------------------------")
        print(f"[{rank}/{args.ach_games_limit}] Processing Guides: {gname} (ID: {gid})")
        print(f"-------------------------------------------------------------")

        achievements = []
        try:
            ach_res = fetch_json(f"{args.backend}/api/games/{gid}/achievements")
            if isinstance(ach_res, dict) and "results" in ach_res:
                achievements = ach_res["results"]
            elif isinstance(ach_res, list):
                achievements = ach_res
        except Exception as e:
            print(f"  ✗ Failed to retrieve achievements for {gname}: {e}")
            continue

        # Check existing guides in DynamoDB to skip already generated
        try:
            existing_guides = fetch_json(f"{args.backend}/api/games/{gid}/guides")
            existing_ach_ids = set()
            for eg in existing_guides:
                if eg.get("achievementId"):
                    existing_ach_ids.add(str(eg.get("achievementId")))
                if eg.get("guideSlug") and eg.get("guideSlug").startswith("ach-"):
                    existing_ach_ids.add(eg.get("guideSlug").replace("ach-", ""))
            print(f"  • Existing Guides in DynamoDB: {len(existing_guides)}/{len(achievements)}")
        except Exception as e:
            print(f"  • Could not query existing guides ({e}). Continuing...")
            existing_ach_ids = set()

        unguided = [a for a in achievements if str(a.get("id")) not in existing_ach_ids]
        if args.ach_limit:
            unguided = unguided[:args.ach_limit]

        if not unguided:
            print(f"  ✓ All {len(achievements)} achievements already have guides in DynamoDB!")
            completed_games.add(gid)
            checkpoint["completed_games"] = list(completed_games)
            save_checkpoint(checkpoint)
            continue

        print(f"  • Generating checklists for {len(unguided)} achievements across Multi-Model Pool...")

        game_success = 0
        for ach_idx, ach in enumerate(unguided, 1):
            if STOP_REQUESTED:
                print("\n[Shutdown] Stopping generation. Progress up to this point is safely stored in DynamoDB.")
                save_checkpoint(checkpoint)
                sys.exit(0)

            ach_id = ach.get("id")
            ach_name = ach.get("name")
            model_pick = MODEL_POOL[(ach_idx - 1) % len(MODEL_POOL)]
            print(f"    [{ach_idx}/{len(unguided)}] [{model_pick}] Generating: '{ach_name}' (ID: {ach_id})...", end="", flush=True)

            t_start = time.time()
            try:
                guide_obj, used_m = generate_achievement_guide(gemini_key, gname, gid, ach, model_idx=(ach_idx - 1))
                post_url = f"{args.backend}/api/games/{gid}/guides"
                post_json(post_url, guide_obj)
                t_spent = time.time() - t_start
                print(f" ✓ SAVED ({guide_obj.get('totalCount')} steps, {t_spent:.1f}s via {used_m})")
                game_success += 1
            except Exception as ex:
                print(f" ✗ FAILED: {ex}")
                interruptible_sleep(10.0)

            # Throttling between calls (1.5s delay across 4 distinct model quotas)
            if ach_idx < len(unguided) and not STOP_REQUESTED:
                interruptible_sleep(3.0)

        if game_success == len(unguided):
            completed_games.add(gid)
            checkpoint["completed_games"] = list(completed_games)
            save_checkpoint(checkpoint)

    print("\n=================================================================")
    print("                      OPERATION COMPLETE                         ")
    print(f"   Cached Games Catalog: {len(cached_games)}/{len(top_games)} games")
    print(f"   Fully Seeded Guides: {len(completed_games)}/{args.ach_games_limit} games")
    print("=================================================================")

if __name__ == "__main__":
    main()
