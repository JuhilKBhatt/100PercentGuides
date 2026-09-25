package com.example.demo.service;

import com.example.demo.config.DynamoDbConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;
import software.amazon.awssdk.services.dynamodb.model.GetItemRequest;
import software.amazon.awssdk.services.dynamodb.model.PutItemRequest;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Supplier;

@Service
public class GameCacheService {

    private static final Logger log = LoggerFactory.getLogger(GameCacheService.class);

    private final StringRedisTemplate redisTemplate;
    private final DynamoDbClient dynamoDbClient;

    public GameCacheService(StringRedisTemplate redisTemplate, DynamoDbClient dynamoDbClient) {
        this.redisTemplate = redisTemplate;
        this.dynamoDbClient = dynamoDbClient;
    }

    public String getOrFetch(String cacheKey, Duration ttl, Supplier<String> fetcher) {
        // 1. Try Redis (L1 in-memory cache)
        try {
            String redisVal = redisTemplate.opsForValue().get(cacheKey);
            if (redisVal != null && !redisVal.isBlank()) {
                log.info("[Redis HIT] key={}", cacheKey);
                return redisVal;
            }
        } catch (Exception ex) {
            log.warn("Redis read failed for key={}: {}", cacheKey, ex.getMessage());
        }

        // 2. Try DynamoDB (L2 persistent database)
        try {
            Map<String, AttributeValue> key = Map.of("cacheKey", AttributeValue.builder().s(cacheKey).build());
            var res = dynamoDbClient.getItem(GetItemRequest.builder()
                    .tableName(DynamoDbConfig.TABLE_NAME)
                    .key(key)
                    .build());
            if (res.hasItem() && res.item().containsKey("payload")) {
                // Check 24-hour TTL expiration
                boolean isExpired = false;
                if (res.item().containsKey("ttl")) {
                    long expireEpochSec = Long.parseLong(res.item().get("ttl").n());
                    long nowEpochSec = System.currentTimeMillis() / 1000;
                    if (nowEpochSec > expireEpochSec) {
                        log.info("[DynamoDB EXPIRED] key={}", cacheKey);
                        isExpired = true;
                    }
                }
                if (!isExpired) {
                    String dbVal = res.item().get("payload").s();
                    log.info("[DynamoDB HIT] key={}", cacheKey);
                    // Backfill Redis with the 24-hour TTL
                    putRedis(cacheKey, dbVal, ttl);
                    return dbVal;
                }
            }
        } catch (Exception ex) {
            log.warn("DynamoDB read failed for key={}: {}", cacheKey, ex.getMessage());
        }

        // 3. Cache Miss: Fetch from source
        log.info("[CACHE MISS] Fetching from source for key={}", cacheKey);
        String freshData = fetcher.get();

        if (freshData != null && !freshData.isBlank()) {
            // Save to DynamoDB with 24-hour TTL
            try {
                long nowEpochSec = System.currentTimeMillis() / 1000;
                long ttlSec = (ttl != null) ? ttl.toSeconds() : 86400L;
                Map<String, AttributeValue> item = new HashMap<>();
                item.put("cacheKey", AttributeValue.builder().s(cacheKey).build());
                item.put("payload", AttributeValue.builder().s(freshData).build());
                item.put("updatedAt", AttributeValue.builder().n(String.valueOf(System.currentTimeMillis())).build());
                item.put("ttl", AttributeValue.builder().n(String.valueOf(nowEpochSec + ttlSec)).build());

                dynamoDbClient.putItem(PutItemRequest.builder()
                        .tableName(DynamoDbConfig.TABLE_NAME)
                        .item(item)
                        .build());
                log.info("[DynamoDB SAVED] key={}, ttlSec={}", cacheKey, ttlSec);
            } catch (Exception ex) {
                log.error("Failed to save to DynamoDB for key={}: {}", cacheKey, ex.getMessage());
            }

            // Save to Redis with 24-hour TTL
            putRedis(cacheKey, freshData, ttl);
        }

        return freshData;
    }

    private void putRedis(String key, String value, Duration ttl) {
        try {
            if (ttl != null) {
                redisTemplate.opsForValue().set(key, value, ttl);
            } else {
                redisTemplate.opsForValue().set(key, value, Duration.ofHours(24));
            }
            log.info("[Redis SAVED] key={}, ttl={}", key, ttl);
        } catch (Exception ex) {
            log.warn("Redis write failed for key={}: {}", key, ex.getMessage());
        }
    }
}
