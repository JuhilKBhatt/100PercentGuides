#!/usr/bin/env python3
import sys
import json
import urllib.request
import os

def seed_guide(file_path, backend_url="http://localhost:8080"):
    if not os.path.exists(file_path):
        print(f"Error: File {file_path} not found.")
        sys.exit(1)

    with open(file_path, "r", encoding="utf-8") as f:
        guide_data = json.load(f)

    game_id = str(guide_data.get("gameId", "3498"))
    guide_slug = guide_data.get("guideSlug")
    title = guide_data.get("title")

    if not guide_slug:
        print("Error: 'guideSlug' is required in guide JSON.")
        sys.exit(1)

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
            print(f"\033[92mSUCCESS:\033[0m Guide '{title}' ({guide_slug}) saved to DynamoDB for game {game_id}!")
            print(f"View guide at: http://localhost:3000/game/{game_id}/{guide_slug}")
    except Exception as e:
        print(f"\033[91mFAILED:\033[0m {e}")
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 scripts/seed_guide.py <path_to_guide_json> [backend_url]")
        print("Example: python3 scripts/seed_guide.py frontend/src/data/guides/3498/spaceship-parts.json")
        sys.exit(1)

    target_file = sys.argv[1]
    backend = sys.argv[2] if len(sys.argv) > 2 else "http://localhost:8080"
    seed_guide(target_file, backend)
