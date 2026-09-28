#!/usr/bin/env python3
import sys
import json
import urllib.request
import os
import argparse
from pathlib import Path

def seed_single_guide(file_path, backend_url="http://localhost:8080", override_ach_id=None, override_game_id=None):
    if not os.path.exists(file_path):
        print(f"\033[91mERROR:\033[0m File '{file_path}' not found.")
        return False

    try:
        with open(file_path, "r", encoding="utf-8") as f:
            guide_data = json.load(f)
    except Exception as e:
        print(f"\033[91mERROR:\033[0m Failed to parse JSON in '{file_path}': {e}")
        return False

    game_id = str(override_game_id or guide_data.get("gameId") or "3498")
    guide_slug = guide_data.get("guideSlug")
    title = guide_data.get("title")

    if not guide_slug:
        guide_slug = Path(file_path).stem.lower().replace(" ", "-")
        guide_data["guideSlug"] = guide_slug

    if override_ach_id:
        guide_data["achievementId"] = str(override_ach_id)
        if "relatedAchievements" not in guide_data:
            guide_data["relatedAchievements"] = [{"id": int(override_ach_id), "name": title or guide_slug}]

    url = f"{backend_url}/api/games/{game_id}/guides"
    payload_bytes = json.dumps(guide_data).encode("utf-8")

    req = urllib.request.Request(
        url,
        data=payload_bytes,
        headers={"Content-Type": "application/json"}
    )

    try:
        with urllib.request.urlopen(req) as res:
            res_json = json.loads(res.read().decode("utf-8"))
            ach_note = f" (linked to Achievement #{guide_data.get('achievementId')})" if guide_data.get("achievementId") else ""
            print(f"\033[92mSUCCESS:\033[0m Saved '{title or guide_slug}' ({guide_slug}) for game {game_id}{ach_note}")
            return True
    except Exception as e:
        print(f"\033[91mFAILED:\033[0m '{file_path}': {e}")
        return False

def seed_directory(dir_path, backend_url="http://localhost:8080", override_game_id=None):
    path = Path(dir_path)
    if not path.is_dir():
        print(f"\033[91mERROR:\033[0m Directory '{dir_path}' not found.")
        sys.exit(1)

    json_files = list(path.glob("**/*.json"))
    if not json_files:
        print(f"No .json files found in '{dir_path}'.")
        return

    print(f"Found {len(json_files)} guide file(s) in '{dir_path}'. Starting bulk import to {backend_url}...")
    success_count = 0
    for f in json_files:
        if seed_single_guide(str(f), backend_url=backend_url, override_game_id=override_game_id):
            success_count += 1

    print(f"\n\033[92mCOMPLETE:\033[0m {success_count}/{len(json_files)} guides successfully imported.")

def main():
    parser = argparse.ArgumentParser(description="Bulk or single seed achievement guides into 100PercentGuides database.")
    parser.add_argument("file", nargs="?", help="Path to single guide JSON file")
    parser.add_argument("--dir", dest="directory", help="Directory of guide JSON files to bulk import")
    parser.add_argument("--backend", default="http://localhost:8080", help="Spring Boot backend URL (default: http://localhost:8080)")
    parser.add_argument("--achievement-id", dest="achievement_id", help="Associate guide with specific achievement ID")
    parser.add_argument("--game-id", dest="game_id", help="Override game ID")

    args = parser.parse_args()

    if args.directory:
        seed_directory(args.directory, backend_url=args.backend, override_game_id=args.game_id)
    elif args.file:
        seed_single_guide(args.file, backend_url=args.backend, override_ach_id=args.achievement_id, override_game_id=args.game_id)
    else:
        parser.print_help()
        sys.exit(1)

if __name__ == "__main__":
    main()
