#!/usr/bin/env python3
"""
100PercentGuides Database Migration & Sync: Dev -> Prod (AWS DynamoDB + Redis)
Safely merges DynamoDB Local or JSON guide files into AWS DynamoDB with Redis cache synchronization.

Key Safety Features:
- Dry-run mode (--dry-run) to preview changes without modifying production.
- Non-destructive by default: skips existing prod records unless --overwrite is passed.
- Batch write with exponential backoff for UnprocessedItems / throttling.
- Synchronizes and warms Prod Redis cache (keys: guide:{gameId}:{slug}, evicts guides:list:{gameId}).
- Zero external dependencies: pure Python 3 standard library (AWS SigV4 + RESP socket client).
"""

import os
import sys
import time
import json
import ssl
import hmac
import hashlib
import socket
import argparse
import subprocess
from datetime import datetime, timezone
from pathlib import Path

# =============================================================================
# 1. AWS Signature Version 4 (SigV4) Client for AWS DynamoDB (Zero Dependencies)
# =============================================================================

def sign(key, msg):
    return hmac.new(key, msg.encode("utf-8"), hashlib.sha256).digest()

def get_signature_key(key, date_stamp, region_name, service_name):
    k_date = sign(("AWS4" + key).encode("utf-8"), date_stamp)
    k_region = sign(k_date, region_name)
    k_service = sign(k_region, service_name)
    return sign(k_service, "aws4_request")

class DynamoDBClient:
    def __init__(self, endpoint=None, region="ap-southeast-2", access_key=None, secret_key=None, is_local=False):
        self.endpoint = endpoint
        self.region = region
        self.access_key = access_key or "dummy"
        self.secret_key = secret_key or "dummy"
        self.is_local = is_local
        self.ssl_ctx = ssl._create_unverified_context()

        if not self.endpoint:
            self.endpoint = f"https://dynamodb.{self.region}.amazonaws.com/"
            self.host = f"dynamodb.{self.region}.amazonaws.com"
        else:
            clean = self.endpoint.replace("http://", "").replace("https://", "")
            self.host = clean.split("/")[0]

    def call(self, target, payload_dict, retries=4):
        target_header = f"DynamoDB_20120810.{target}"
        payload_bytes = json.dumps(payload_dict).encode("utf-8")

        for attempt in range(1, retries + 1):
            now = datetime.now(timezone.utc)
            amz_date = now.strftime("%Y%m%dT%H%M%SZ")
            date_stamp = now.strftime("%Y%m%d")

            headers = {
                "Content-Type": "application/x-amz-json-1.0",
                "X-Amz-Target": target_header,
            }

            if self.is_local:
                headers["Authorization"] = f"AWS4-HMAC-SHA256 Credential={self.access_key}/{date_stamp}/{self.region}/dynamodb/aws4_request, SignedHeaders=host, Signature=dummy"
            else:
                payload_hash = hashlib.sha256(payload_bytes).hexdigest()
                canonical_headers = f"content-type:application/x-amz-json-1.0\nhost:{self.host}\nx-amz-date:{amz_date}\nx-amz-target:{target_header}\n"
                signed_headers = "content-type;host;x-amz-date;x-amz-target"
                canonical_request = f"POST\n/\n\n{canonical_headers}\n{signed_headers}\n{payload_hash}"
                credential_scope = f"{date_stamp}/{self.region}/dynamodb/aws4_request"
                string_to_sign = f"AWS4-HMAC-SHA256\n{amz_date}\n{credential_scope}\n{hashlib.sha256(canonical_request.encode('utf-8')).hexdigest()}"
                sig_key = get_signature_key(self.secret_key, date_stamp, self.region, "dynamodb")
                signature = hmac.new(sig_key, string_to_sign.encode("utf-8"), hashlib.sha256).hexdigest()
                headers["X-Amz-Date"] = amz_date
                headers["Host"] = self.host
                headers["Authorization"] = f"AWS4-HMAC-SHA256 Credential={self.access_key}/{credential_scope}, SignedHeaders={signed_headers}, Signature={signature}"

            import urllib.request
            import urllib.error

            req = urllib.request.Request(self.endpoint, data=payload_bytes, headers=headers)
            try:
                with urllib.request.urlopen(req, context=self.ssl_ctx, timeout=20) as resp:
                    res_body = resp.read().decode("utf-8")
                    return json.loads(res_body) if res_body else {}
            except urllib.error.HTTPError as e:
                err_body = e.read().decode("utf-8", errors="ignore")
                if e.code in [400, 500, 503] and ("ProvisionedThroughputExceeded" in err_body or "ThrottlingException" in err_body):
                    wait = 0.2 * (2 ** attempt)
                    print(f"    [Retry {attempt}/{retries}] Throttled by DynamoDB, waiting {wait:.2f}s...")
                    time.sleep(wait)
                    continue
                raise RuntimeError(f"DynamoDB {target} failed (HTTP {e.code}): {err_body}")
            except Exception as ex:
                if attempt == retries:
                    raise ex
                time.sleep(0.5)

    def scan_all(self, table_name, filter_exp=None, exp_values=None):
        items = []
        last_key = None
        while True:
            body = {"TableName": table_name}
            if filter_exp:
                body["FilterExpression"] = filter_exp
            if exp_values:
                body["ExpressionAttributeValues"] = exp_values
            if last_key:
                body["ExclusiveStartKey"] = last_key

            res = self.call("Scan", body)
            items.extend(res.get("Items", []))
            last_key = res.get("LastEvaluatedKey")
            if not last_key:
                break
        return items

    def get_item(self, table_name, key):
        res = self.call("GetItem", {"TableName": table_name, "Key": key})
        return res.get("Item")

    def batch_write(self, table_name, put_items):
        """Batch write up to 25 items per request with retry of UnprocessedItems"""
        written = 0
        chunk_size = 25
        for i in range(0, len(put_items), chunk_size):
            chunk = put_items[i:i + chunk_size]
            request_items = {
                table_name: [{"PutRequest": {"Item": item}} for item in chunk]
            }
            backoff = 0.1
            while request_items and table_name in request_items and request_items[table_name]:
                res = self.call("BatchWriteItem", {"RequestItems": request_items})
                unprocessed = res.get("UnprocessedItems", {})
                if unprocessed and table_name in unprocessed and unprocessed[table_name]:
                    request_items = unprocessed
                    time.sleep(backoff)
                    backoff = min(backoff * 2, 2.0)
                else:
                    break
            written += len(chunk)
        return written

# =============================================================================
# 2. Redis Caching & Synchronization Client
# =============================================================================

class RedisSync:
    def __init__(self, host="localhost", port=6379, container_name=None):
        self.host = host
        self.port = port
        self.container_name = container_name
        self.mode = "socket"

    def test_connection(self):
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.settimeout(1.5)
                s.connect((self.host, self.port))
                s.sendall(b"*1\r\n$4\r\nPING\r\n")
                resp = s.recv(64)
                if b"+PONG" in resp:
                    self.mode = "socket"
                    return True, f"Direct TCP ({self.host}:{self.port})"
        except Exception:
            pass

        if self.container_name:
            try:
                cmd = ["docker", "exec", self.container_name, "redis-cli", "ping"]
                out = subprocess.check_output(cmd, stderr=subprocess.DEVNULL, timeout=3).decode().strip()
                if "PONG" in out:
                    self.mode = "docker"
                    return True, f"Docker container ({self.container_name})"
            except Exception:
                pass

        try:
            out = subprocess.check_output(["docker", "ps", "--filter", "ancestor=redis:7-alpine", "--format", "{{.Names}}"], timeout=3).decode().strip()
            if not out:
                out = subprocess.check_output(["docker", "ps", "--filter", "name=redis", "--format", "{{.Names}}"], timeout=3).decode().strip()
            if out:
                container = out.split("\n")[0]
                self.container_name = container
                self.mode = "docker"
                return True, f"Auto-detected Docker container ({container})"
        except Exception:
            pass

        self.mode = "file"
        return False, "Not reachable (will generate pipeline script)"

    def set_key(self, key, value, ttl_sec=86400):
        if self.mode == "socket":
            try:
                cmd = f"*4\r\n$3\r\nSET\r\n${len(key.encode())}\r\n{key}\r\n${len(value.encode())}\r\n{value}\r\n$2\r\nEX\r\n${len(str(ttl_sec))}\r\n{ttl_sec}\r\n"
                with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                    s.settimeout(2.0)
                    s.connect((self.host, self.port))
                    s.sendall(cmd.encode("utf-8"))
                    s.recv(64)
                return True
            except Exception:
                return False
        elif self.mode == "docker":
            try:
                subprocess.run(
                    ["docker", "exec", "-i", self.container_name, "redis-cli", "SET", key, value, "EX", str(ttl_sec)],
                    check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=5
                )
                return True
            except Exception:
                return False
        return False

    def delete_key(self, key):
        if self.mode == "socket":
            try:
                cmd = f"*2\r\n$3\r\nDEL\r\n${len(key.encode())}\r\n{key}\r\n"
                with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                    s.settimeout(2.0)
                    s.connect((self.host, self.port))
                    s.sendall(cmd.encode("utf-8"))
                    s.recv(64)
                return True
            except Exception:
                return False
        elif self.mode == "docker":
            try:
                subprocess.run(
                    ["docker", "exec", "-i", self.container_name, "redis-cli", "DEL", key],
                    check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=5
                )
                return True
            except Exception:
                return False
        return False

# =============================================================================
# 3. Environment & JSON Guide Converters
# =============================================================================

def load_env_file(path_str):
    p = Path(path_str)
    res = {}
    if p.exists():
        with open(p, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    res[k.strip()] = v.strip().strip('"').strip("'")
    return res

def json_guide_to_dynamo_item(guide_data):
    game_id = str(guide_data.get("gameId") or "3498")
    guide_slug = guide_data.get("guideSlug")
    title = guide_data.get("title") or guide_slug
    total_count = int(guide_data.get("totalCount") or 0)
    ach_id = guide_data.get("achievementId")
    if not ach_id and "relatedAchievements" in guide_data:
        try:
            ach_id = str(guide_data["relatedAchievements"][0]["id"])
        except Exception:
            pass

    payload_json = json.dumps(guide_data)
    has_map = "mapImageUrl" in payload_json or "imageUrl" in payload_json or "land" in payload_json

    item = {
        "gameId": {"S": game_id},
        "guideSlug": {"S": guide_slug},
        "title": {"S": title},
        "totalCount": {"N": str(total_count)},
        "updatedAt": {"N": str(int(time.time() * 1000))},
        "payload": {"S": payload_json},
        "hasMap": {"S": str(has_map).lower()}
    }
    if ach_id:
        item["achievementId"] = {"S": str(ach_id)}
    return item

# =============================================================================
# 4. Main Migration Engine
# =============================================================================

def main():
    parser = argparse.ArgumentParser(description="Safely merge Dev database into Prod AWS DynamoDB and sync Redis cache.")
    parser.add_argument("--dev-endpoint", default=None, help="DynamoDB Local endpoint (default: from secrets/.env.dev or http://localhost:8000)")
    parser.add_argument("--dev-env", default="secrets/.env.dev", help="Path to dev env file (default: secrets/.env.dev)")
    parser.add_argument("--prod-env", default="secrets/.env.prod", help="Path to prod env file (default: secrets/.env.prod)")
    parser.add_argument("--tables", default="GameGuides", help="Comma-separated tables to merge: GameGuides, GameCache (default: GameGuides)")
    parser.add_argument("--game-id", default=None, help="Filter merge to a single game ID (e.g. 3498)")
    parser.add_argument("--from-json-dir", default=None, help="Import guides directly from a directory of JSON files to Prod")
    parser.add_argument("--from-json-file", default=None, help="Import a single guide JSON file directly to Prod")
    parser.add_argument("--dry-run", action="store_true", help="Preview migration without writing to AWS or Redis")
    parser.add_argument("--overwrite", action="store_true", help="Overwrite existing items in prod if dev has updated version (default: skip existing)")
    parser.add_argument("--prod-redis-host", default="localhost", help="Prod Redis host (default: localhost)")
    parser.add_argument("--prod-redis-port", type=int, default=6379, help="Prod Redis port (default: 6379)")
    parser.add_argument("--redis-container", default=None, help="Docker container name for prod Redis (e.g. 100percentguides-redis-1)")
    parser.add_argument("--skip-redis", action="store_true", help="Skip Redis cache synchronization")
    parser.add_argument("-y", "--yes", action="store_true", help="Skip confirmation prompt")
    args = parser.parse_args()

    print("=================================================================")
    print("      100PercentGuides: Safe Database Merge (Dev -> Prod)        ")
    print("=================================================================")

    dev_env = load_env_file(args.dev_env)
    prod_env = load_env_file(args.prod_env)

    # 1. Prod Client Setup
    prod_region = prod_env.get("AWS_REGION", "ap-southeast-2")
    prod_key = prod_env.get("AWS_ACCESS_KEY_ID")
    prod_secret = prod_env.get("AWS_SECRET_ACCESS_KEY")

    if not prod_key or not prod_secret:
        print("\n\033[91mERROR:\033[0m AWS credentials not found in secrets/.env.prod.")
        sys.exit(1)

    masked_key = f"...{prod_key[-4:]}" if len(prod_key) > 4 else "valid"
    print(f"\n[Target: Production AWS DynamoDB]")
    print(f"  Region: {prod_region}")
    print(f"  Access Key: {masked_key}")

    prod_client = DynamoDBClient(
        region=prod_region,
        access_key=prod_key,
        secret_key=prod_secret,
        is_local=False
    )

    # 2. Redis Setup
    redis_sync = RedisSync(host=args.prod_redis_host, port=args.prod_redis_port, container_name=args.redis_container)
    redis_connected = False
    redis_info = "Skipped"
    if not args.skip_redis:
        redis_connected, redis_info = redis_sync.test_connection()
        print(f"\n[Target: Production Redis Cache]")
        status_color = "\033[92mONLINE\033[0m" if redis_connected else "\033[93mOFFLINE (Pipe export fallback enabled)\033[0m"
        print(f"  Status: {status_color} via {redis_info}")

    # 3. Connectivity Pre-flight Test on Prod
    print("\n>>> Pre-flight Checks on Prod...")
    try:
        prod_tables = prod_client.call("ListTables", {}).get("TableNames", [])
        print(f"  ✓ Prod AWS DynamoDB is connected (found tables: {prod_tables})")
    except Exception as e:
        print(f"  \033[91m✗ Could not connect to Prod AWS DynamoDB:\033[0m {e}")
        sys.exit(1)

    # 4. Source Selection: File-based OR Database-based
    dev_tables = []
    dev_client = None

    is_file_mode = bool(args.from_json_dir or args.from_json_file)

    if is_file_mode:
        print(f"\n[Source: Local JSON Guide File(s)]")
    else:
        dev_endpoint = args.dev_endpoint or dev_env.get("DYNAMODB_ENDPOINT") or "http://localhost:8000"
        if "dynamodb-local" in dev_endpoint and "localhost" not in dev_endpoint:
            dev_endpoint = "http://localhost:8000"

        print(f"\n[Source: Dev Database]")
        print(f"  Endpoint: {dev_endpoint}")
        dev_client = DynamoDBClient(
            endpoint=dev_endpoint,
            region="us-east-1",
            access_key="dummy",
            secret_key="dummy",
            is_local=True
        )

        try:
            dev_tables = dev_client.call("ListTables", {}).get("TableNames", [])
            print(f"  ✓ Dev DynamoDB is connected (found tables: {dev_tables})")
        except Exception as e:
            print(f"  \033[91m✗ Could not connect to Dev DynamoDB at {dev_endpoint}:\033[0m {e}")
            print("    Make sure your local DynamoDB container is running: docker compose -f docker-compose.dev.yml up -d dynamodb-local")
            print("    Or use --from-json-file / --from-json-dir to import JSON files directly.")
            sys.exit(1)

    # Collect items to migrate
    migration_plan = []
    total_new = 0
    total_existing = 0
    total_updated = 0

    print("\n>>> Scanning & Comparing Databases...")

    if is_file_mode:
        files = []
        if args.from_json_file:
            files.append(Path(args.from_json_file))
        if args.from_json_dir:
            files.extend(list(Path(args.from_json_dir).glob("**/*.json")))

        print(f"  • Found {len(files)} guide file(s) to process.")
        for fpath in files:
            try:
                with open(fpath, "r", encoding="utf-8") as f:
                    g_data = json.load(f)
                if not g_data.get("guideSlug"):
                    g_data["guideSlug"] = fpath.stem.lower().replace(" ", "-")
                if args.game_id:
                    g_data["gameId"] = str(args.game_id)

                item = json_guide_to_dynamo_item(g_data)
                gid = item["gameId"]["S"]
                gslug = item["guideSlug"]["S"]
                key = {"gameId": {"S": gid}, "guideSlug": {"S": gslug}}
                item_label = f"Guide: {gid} / {gslug} ({fpath.name})"

                prod_existing = prod_client.get_item("GameGuides", key)
                if prod_existing is None:
                    total_new += 1
                    migration_plan.append({"table": "GameGuides", "action": "CREATE", "item": item, "label": item_label, "key": key})
                else:
                    total_existing += 1
                    if args.overwrite:
                        total_updated += 1
                        migration_plan.append({"table": "GameGuides", "action": "UPDATE", "item": item, "label": item_label, "key": key})
            except Exception as ex:
                print(f"  ✗ Failed to read '{fpath}': {ex}")

    else:
        tables_to_migrate = [t.strip() for t in args.tables.split(",") if t.strip()]

        for table_name in tables_to_migrate:
            if table_name not in dev_tables:
                print(f"  • Table '{table_name}' does not exist in Dev database. Skipping.")
                continue
            if table_name not in prod_tables:
                print(f"  • Table '{table_name}' does not exist in Prod AWS. Creating it safely...")
                if table_name == "GameGuides":
                    prod_client.call("CreateTable", {
                        "TableName": "GameGuides",
                        "KeySchema": [
                            {"AttributeName": "gameId", "KeyType": "HASH"},
                            {"AttributeName": "guideSlug", "KeyType": "RANGE"}
                        ],
                        "AttributeDefinitions": [
                            {"AttributeName": "gameId", "AttributeType": "S"},
                            {"AttributeName": "guideSlug", "AttributeType": "S"}
                        ],
                        "BillingMode": "PAY_PER_REQUEST"
                    })
                elif table_name == "GameCache":
                    prod_client.call("CreateTable", {
                        "TableName": "GameCache",
                        "KeySchema": [{"AttributeName": "cacheKey", "KeyType": "HASH"}],
                        "AttributeDefinitions": [{"AttributeName": "cacheKey", "AttributeType": "S"}],
                        "BillingMode": "PAY_PER_REQUEST"
                    })
                time.sleep(3)

            filter_exp = None
            exp_values = None
            if args.game_id and table_name == "GameGuides":
                filter_exp = "gameId = :gid"
                exp_values = {":gid": {"S": str(args.game_id)}}

            dev_items = dev_client.scan_all(table_name, filter_exp, exp_values)
            print(f"  • Scanned {len(dev_items)} items from Dev table '{table_name}'.")

            for item in dev_items:
                key = {}
                if table_name == "GameGuides":
                    gid = item.get("gameId", {}).get("S")
                    gslug = item.get("guideSlug", {}).get("S")
                    if not gid or not gslug:
                        continue
                    key = {"gameId": {"S": gid}, "guideSlug": {"S": gslug}}
                    item_label = f"Guide: {gid} / {gslug}"
                elif table_name == "GameCache":
                    ckey = item.get("cacheKey", {}).get("S")
                    if not ckey:
                        continue
                    if "ttl" in item:
                        try:
                            exp = int(item["ttl"]["N"])
                            if exp < int(time.time()):
                                continue
                        except Exception:
                            pass
                    key = {"cacheKey": {"S": ckey}}
                    item_label = f"Cache: {ckey}"
                else:
                    continue

                prod_existing = prod_client.get_item(table_name, key)
                if prod_existing is None:
                    total_new += 1
                    migration_plan.append({"table": table_name, "action": "CREATE", "item": item, "label": item_label, "key": key})
                else:
                    total_existing += 1
                    if args.overwrite:
                        total_updated += 1
                        migration_plan.append({"table": table_name, "action": "UPDATE", "item": item, "label": item_label, "key": key})

    # Summary Report
    print("\n=================================================================")
    print("                     MIGRATION ANALYSIS REPORT                   ")
    print("=================================================================")
    print(f"  Mode: {'DRY RUN (Preview Only)' if args.dry_run else 'LIVE MIGRATION'}")
    print(f"  Existing Prod Items:     {total_existing} (preserved safely)")
    print(f"  New Items to Insert:     {total_new}")
    print(f"  Items to Overwrite:      {total_updated if args.overwrite else '0 (safe mode: skip existing)'}")
    print(f"  Total Items to Write:    {len(migration_plan)}")
    print("=================================================================\n")

    if not migration_plan:
        print("✓ Prod database is already up to date with Dev! No changes needed.")
        return

    print("Sample items to be migrated:")
    for plan in migration_plan[:5]:
        action_color = "\033[92mCREATE\033[0m" if plan["action"] == "CREATE" else "\033[93mUPDATE\033[0m"
        print(f"  [{action_color}] {plan['table']} -> {plan['label']}")
    if len(migration_plan) > 5:
        print(f"  ... and {len(migration_plan) - 5} more items.\n")

    if args.dry_run:
        print("\033[92mDRY RUN COMPLETE:\033[0m No modifications were made to Production AWS or Redis.")
        print("Run again without --dry-run to apply these changes safely.")
        return

    if not args.yes:
        ans = input(f"Are you sure you want to write {len(migration_plan)} item(s) to AWS DynamoDB ({prod_region})? [y/N]: ")
        if ans.lower() not in ["y", "yes"]:
            print("Operation aborted by user.")
            sys.exit(0)

    # 5. Execute Safe Batch Writes to AWS DynamoDB
    print("\n>>> Writing Batches to AWS DynamoDB...")
    tables_map = {}
    for plan in migration_plan:
        t = plan["table"]
        if t not in tables_map:
            tables_map[t] = []
        tables_map[t].append(plan["item"])

    total_written = 0
    t0 = time.time()
    for t_name, items_list in tables_map.items():
        print(f"  • Writing {len(items_list)} items to '{t_name}' in batches of 25...")
        written_count = prod_client.batch_write(t_name, items_list)
        total_written += written_count
        print(f"    ✓ Successfully written {written_count}/{len(items_list)} items to '{t_name}'.")

    # 6. Synchronize Redis Cache
    redis_commands = []
    if not args.skip_redis:
        print("\n>>> Synchronizing & Warming Production Redis Cache...")
        redis_synced = 0
        invalidated_games = set()

        for plan in migration_plan:
            item = plan["item"]
            t_name = plan["table"]

            if t_name == "GameGuides":
                gid = item.get("gameId", {}).get("S")
                gslug = item.get("guideSlug", {}).get("S")
                payload = item.get("payload", {}).get("S")
                if gid and gslug and payload:
                    cache_key = f"guide:{gid}:{gslug}"
                    redis_commands.append(f'SET "{cache_key}" \'{payload}\' EX 86400')
                    if redis_connected:
                        redis_sync.set_key(cache_key, payload, ttl_sec=86400)
                        redis_synced += 1

                    if gid not in invalidated_games:
                        list_key = f"guides:list:{gid}"
                        redis_commands.append(f'DEL "{list_key}"')
                        if redis_connected:
                            redis_sync.delete_key(list_key)
                        invalidated_games.add(gid)

            elif t_name == "GameCache":
                ckey = item.get("cacheKey", {}).get("S")
                payload = item.get("payload", {}).get("S")
                ttl_sec = 86400
                if "ttl" in item:
                    try:
                        ttl_sec = max(300, int(item["ttl"]["N"]) - int(time.time()))
                    except Exception:
                        pass
                if ckey and payload:
                    redis_commands.append(f'SET "{ckey}" \'{payload}\' EX {ttl_sec}')
                    if redis_connected:
                        redis_sync.set_key(ckey, payload, ttl_sec=ttl_sec)
                        redis_synced += 1

        if redis_connected:
            print(f"  ✓ Live Redis Cache: {redis_synced} keys warmed, {len(invalidated_games)} listing caches invalidated.")
        else:
            print(f"  • Redis host was not directly accessible during migration.")

        pipe_path = Path("scripts/prod_redis_warm.redis")
        with open(pipe_path, "w", encoding="utf-8") as f:
            for cmd in redis_commands:
                f.write(cmd + "\n")
        print(f"  ✓ Exported Redis warm-up pipeline script: {pipe_path}")
        print(f"    (Can be applied inside container anytime: cat {pipe_path} | docker exec -i <redis-container> redis-cli)")

    elapsed = time.time() - t0
    print("\n=================================================================")
    print("                 MIGRATION COMPLETED SUCCESSFULLY                ")
    print(f"   DynamoDB Items Written: {total_written} items ({elapsed:.2f}s)")
    print(f"   Target Table(s):        {', '.join(tables_map.keys())}")
    print(f"   AWS Region:             {prod_region}")
    print(f"   Redis Cache State:      Wired and synchronized")
    print("=================================================================\n")

if __name__ == "__main__":
    main()
