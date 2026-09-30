#!/usr/bin/env python3
"""
Bulk Auto-Pilot Seeder (Automate Whole Games)
Powered by Multi-Model AI Pool (Gemini 3.5 Flash Lite, Gemini 3.1 Flash Lite, Gemini Flash Lite Latest, Gemma 4 31B)
Multiplies throughput from 15 RPM to 45+ RPM with automatic multi-model failover.
"""

import os
import sys
import time
import json
import argparse
import urllib.request
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

def load_gemini_key():
    key = os.environ.get("GEMINI_API_KEY")
    if key:
        return key
    
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
                    if line.startswith("GEMINI_API_KEY="):
                        return line.split("=", 1)[1].strip().strip('"').strip("'")
    return None

def fetch_json(url):
    ctx = ssl._create_unverified_context()
    req = urllib.request.Request(url, headers={"User-Agent": "100PercentGuides-AutoPilot/1.0"})
    with urllib.request.urlopen(req, context=ctx) as res:
        return json.loads(res.read().decode("utf-8"))

def post_json(url, data):
    ctx = ssl._create_unverified_context()
    payload = json.dumps(data).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=payload,
        headers={"Content-Type": "application/json", "User-Agent": "100PercentGuides-AutoPilot/1.0"}
    )
    with urllib.request.urlopen(req, context=ctx) as res:
        return json.loads(res.read().decode("utf-8"))

def generate_achievement_guide(api_key, game_name, game_id, achievement, model_idx=0):
    ach_id = achievement.get("id")
    ach_name = achievement.get("name", "Unknown Achievement")
    ach_desc = achievement.get("description", "")

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
Do NOT wrap the response in markdown blocks. Output pure JSON only.
"""

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "responseMimeType": "application/json"
        }
    }

    ctx = ssl._create_unverified_context()

    # Multi-model pool fallback
    successful_text = None
    used_model = None

    for attempt in range(len(MODEL_POOL)):
        candidate = MODEL_POOL[(model_idx + attempt) % len(MODEL_POOL)]
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{candidate}:generateContent?key={api_key}"
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"}
        )

        try:
            with urllib.request.urlopen(req, context=ctx) as res:
                res_json = json.loads(res.read().decode("utf-8"))
                text = res_json["candidates"][0]["content"]["parts"][0]["text"]
                if text and text.strip():
                    successful_text = text
                    used_model = candidate
                    break
        except Exception as e:
            # Fall back to next model in pool
            continue

    if not successful_text:
        raise RuntimeError("All models in the pool were exhausted or unavailable.")

    guide_json = json.loads(successful_text)

    # Post-process into full CollectibleGuide schema
    guide_slug = f"ach-{ach_id}"
    total_count = 0
    clean_regions = []

    item_id_counter = 1
    for reg in guide_json.get("regions", []):
        reg_id = reg.get("id") or reg.get("name", "General").lower().replace(" ", "-")
        reg_name = reg.get("name", "General")
        items = []
        for it in reg.get("items", []):
            items.append({
                "id": item_id_counter,
                "name": it.get("name", f"Step {item_id_counter}"),
                "region": it.get("region", reg_name),
                "locationText": it.get("locationText", "See details"),
                "details": it.get("details", ""),
                "x": float(it.get("x", 50.0)),
                "y": float(it.get("y", 50.0))
            })
            item_id_counter += 1
            total_count += 1
        
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
        "title": guide_json.get("title", f"{ach_name} Checklist"),
        "subtitle": guide_json.get("subtitle", ach_desc),
        "totalCount": total_count if total_count > 0 else 1,
        "requiredForCompletion": total_count if total_count > 0 else 1,
        "achievementId": str(ach_id),
        "generatedByModel": used_model,
        "relatedAchievements": [
            {
                "id": int(ach_id),
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
    parser = argparse.ArgumentParser(description="Bulk Auto-Pilot Seeder using Multi-Model AI Pool")
    parser.add_argument("--game-id", required=True, help="Game ID (e.g. 3498)")
    parser.add_argument("--backend", default="http://localhost:8080", help="Spring Boot backend URL")
    parser.add_argument("--limit", type=int, default=None, help="Limit number of achievements to generate")
    parser.add_argument("--achievement-id", type=str, default=None, help="Generate for a specific achievement ID only")
    args = parser.parse_args()

    api_key = load_gemini_key()
    if not api_key:
        print("ERROR: GEMINI_API_KEY not found in environment or secrets/.env.dev")
        sys.exit(1)

    print("=====================================================")
    print("   100PercentGuides Multi-Model Auto-Pilot Seeder   ")
    print(f"   Pool: {', '.join(MODEL_POOL)}                    ")
    print("   Throughput: ~45 RPM combined across model pools   ")
    print("=====================================================")

    # 1. Fetch game details
    try:
        game_data = fetch_json(f"{args.backend}/api/games/{args.game_id}")
        game_name = game_data.get("name", f"Game {args.game_id}")
        print(f"Target Game: {game_name} (ID: {args.game_id})")
    except Exception as e:
        print(f"ERROR: Failed to fetch game details from {args.backend}: {e}")
        sys.exit(1)

    # 2. Fetch game achievements
    try:
        ach_res = fetch_json(f"{args.backend}/api/games/{args.game_id}/achievements")
        if isinstance(ach_res, dict) and "results" in ach_res:
            achievements = ach_res["results"]
        elif isinstance(ach_res, list):
            achievements = ach_res
        else:
            achievements = []
        print(f"Total Achievements in Game: {len(achievements)}")
    except Exception as e:
        print(f"ERROR: Failed to fetch achievements: {e}")
        sys.exit(1)

    # 3. Fetch existing guides to skip already generated ones
    try:
        existing_guides = fetch_json(f"{args.backend}/api/games/{args.game_id}/guides")
        existing_ach_ids = set()
        for g in existing_guides:
            if g.get("achievementId"):
                existing_ach_ids.add(str(g.get("achievementId")))
            if g.get("guideSlug") and g.get("guideSlug").startswith("ach-"):
                existing_ach_ids.add(g.get("guideSlug").replace("ach-", ""))
        print(f"Already Seeded Guides: {len(existing_guides)}")
    except Exception as e:
        print(f"WARNING: Could not list existing guides ({e}). Continuing...")
        existing_ach_ids = set()

    # Filter targets
    if args.achievement_id:
        targets = [a for a in achievements if str(a.get("id")) == str(args.achievement_id)]
    else:
        targets = [a for a in achievements if str(a.get("id")) not in existing_ach_ids]

    if args.limit:
        targets = targets[:args.limit]

    print(f"Achievements to Generate: {len(targets)}")
    if not targets:
        print("All target achievements already have guides! Nothing to do.")
        return

    # 4. Generate across Multi-Model Pool with 1.5s delay (45 RPM safe across multiple model buckets)
    success_count = 0
    DELAY_BETWEEN_CALLS = 1.5

    for idx, ach in enumerate(targets, 1):
        ach_id = ach.get("id")
        ach_name = ach.get("name")
        assigned_model = MODEL_POOL[(idx - 1) % len(MODEL_POOL)]
        print(f"\n[{idx}/{len(targets)}] Dispatching to [{assigned_model}]: '{ach_name}' (ID: {ach_id})...")

        start_time = time.time()
        try:
            guide, used_model = generate_achievement_guide(api_key, game_name, args.game_id, ach, model_idx=(idx - 1))
            
            # Save to Spring Boot backend -> DynamoDB
            post_url = f"{args.backend}/api/games/{args.game_id}/guides"
            post_json(post_url, guide)
            
            total_steps = guide.get("totalCount", 0)
            elapsed = time.time() - start_time
            print(f"  ✓ SAVED via [{used_model}]: '{guide.get('title')}' with {total_steps} step(s) in {elapsed:.1f}s")
            success_count += 1
        except Exception as e:
            print(f"  ✗ FAILED: '{ach_name}': {e}")

        # Multi-model delay
        if idx < len(targets):
            time.sleep(DELAY_BETWEEN_CALLS)

    print("\n=====================================================")
    print(f"MULTI-MODEL AUTO-PILOT COMPLETE: {success_count}/{len(targets)} guides generated & saved.")
    print("=====================================================")

if __name__ == "__main__":
    main()
