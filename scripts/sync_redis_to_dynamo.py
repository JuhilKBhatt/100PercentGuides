#!/usr/bin/env python3
import json
import time
import boto3
import redis

print('Connecting to DynamoDB Local and Redis...')
dynamodb = boto3.resource(
    'dynamodb',
    endpoint_url='http://dynamodb-local:8000',
    region_name='us-east-1',
    aws_access_key_id='test',
    aws_secret_access_key='test'
)
table = dynamodb.Table('GameGuides')

r = redis.Redis(host='redis', port=6379, decode_responses=True)

print('Querying Redis for all guide keys...')
keys = r.keys('guide:*')
print(f'Total guide keys in Redis to sync: {len(keys)}')

synced = 0
errors = 0
now = int(time.time() * 1000)

with table.batch_writer() as batch:
    for idx, key in enumerate(keys, 1):
        try:
            parts = key.split(':', 2)
            if len(parts) < 3:
                continue
            game_id = parts[1]
            guide_slug = parts[2]

            raw_payload = r.get(key)
            if not raw_payload:
                continue

            data = json.loads(raw_payload)
            title = data.get('title', guide_slug)
            total_count = int(data.get('totalCount', 0))

            item = {
                'gameId': str(game_id),
                'guideSlug': str(guide_slug),
                'title': title,
                'totalCount': total_count,
                'payload': raw_payload,
                'updatedAt': now
            }

            ach_id = data.get('achievementId')
            if not ach_id and 'relatedAchievements' in data and data['relatedAchievements']:
                ach_id = str(data['relatedAchievements'][0].get('id'))
            if ach_id:
                item['achievementId'] = str(ach_id)

            has_map = bool(data.get('maps') and len(data['maps']) > 0 and data['maps'][0].get('imageUrl'))
            item['hasMap'] = str(has_map)

            batch.put_item(Item=item)
            synced += 1

            if synced % 250 == 0:
                print(f'  ...synced {synced}/{len(keys)} guides to DynamoDB...')
        except Exception as e:
            errors += 1

print(f'Done! Successfully synced {synced} guides from Redis to DynamoDB ({errors} errors).')
