package com.example.demo.service;

import com.example.demo.config.DynamoDbConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.*;

import java.time.Duration;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class GuideService {

    private static final Logger log = LoggerFactory.getLogger(GuideService.class);
    private static final Duration TTL_24_HOURS = Duration.ofHours(24);

    private final DynamoDbClient dynamoDbClient;
    private final StringRedisTemplate redisTemplate;

    public GuideService(DynamoDbClient dynamoDbClient, StringRedisTemplate redisTemplate) {
        this.dynamoDbClient = dynamoDbClient;
        this.redisTemplate = redisTemplate;
    }

    public void signalUserPriority() {
        try {
            redisTemplate.opsForValue().set("user_active_priority", "1", Duration.ofSeconds(30));
        } catch (Exception e) {
            log.warn("Failed to set user priority in Redis: {}", e.getMessage());
        }
    }

    public boolean isUserPriorityActive() {
        try {
            String val = redisTemplate.opsForValue().get("user_active_priority");
            return "1".equals(val);
        } catch (Exception e) {
            return false;
        }
    }

    public boolean saveGuide(String gameId, String guideSlug, String title, int totalCount, String payloadJson) {
        log.info("Saving guide to DynamoDB: gameId={}, guideSlug={}, title={}", gameId, guideSlug, title);
        try {
            long now = System.currentTimeMillis();
            Map<String, AttributeValue> item = new HashMap<>();
            item.put("gameId", AttributeValue.builder().s(gameId).build());
            item.put("guideSlug", AttributeValue.builder().s(guideSlug).build());
            item.put("title", AttributeValue.builder().s(title).build());
            item.put("totalCount", AttributeValue.builder().n(String.valueOf(totalCount)).build());
            item.put("payload", AttributeValue.builder().s(payloadJson).build());
            item.put("updatedAt", AttributeValue.builder().n(String.valueOf(now)).build());

            String achId = extractAchievementId(payloadJson);
            if (achId == null && guideSlug != null && guideSlug.startsWith("ach-")) {
                achId = guideSlug.substring(4);
            }
            if (achId != null) {
                item.put("achievementId", AttributeValue.builder().s(achId).build());
            }
            boolean hasMap = checkHasMap(payloadJson);
            item.put("hasMap", AttributeValue.builder().s(String.valueOf(hasMap)).build());

            dynamoDbClient.putItem(PutItemRequest.builder()
                    .tableName(DynamoDbConfig.GUIDES_TABLE)
                    .item(item)
                    .build());

            // Cache in Redis
            String cacheKey = "guide:" + gameId + ":" + guideSlug;
            redisTemplate.opsForValue().set(cacheKey, payloadJson, TTL_24_HOURS);
            redisTemplate.delete("guides:list:" + gameId);
            return true;
        } catch (Exception ex) {
            log.error("Failed to save guide to DynamoDB: {}", ex.getMessage(), ex);
            return false;
        }
    }

    public String getGuide(String gameId, String guideSlug) {
        String cacheKey = "guide:" + gameId + ":" + guideSlug;

        // 1. Try Redis
        try {
            String cached = redisTemplate.opsForValue().get(cacheKey);
            if (cached != null && !cached.isBlank()) {
                log.info("[Redis HIT] Guide key={}", cacheKey);
                return cached;
            }
        } catch (Exception e) {
            log.warn("Redis guide read failed: {}", e.getMessage());
        }

        // 2. Try DynamoDB
        String fromDb = getGuideFromDb(gameId, guideSlug);
        if (fromDb != null) {
            log.info("[DynamoDB HIT] Guide gameId={}, guideSlug={}", gameId, guideSlug);
            try {
                redisTemplate.opsForValue().set(cacheKey, fromDb, TTL_24_HOURS);
            } catch (Exception ignored) {}
            return fromDb;
        }

        log.warn("Guide not found in database for gameId={}, guideSlug={}", gameId, guideSlug);
        return null;
    }

    private String getGuideFromDb(String gameId, String guideSlug) {
        try {
            Map<String, AttributeValue> key = new HashMap<>();
            key.put("gameId", AttributeValue.builder().s(gameId).build());
            key.put("guideSlug", AttributeValue.builder().s(guideSlug).build());

            GetItemResponse response = dynamoDbClient.getItem(GetItemRequest.builder()
                    .tableName(DynamoDbConfig.GUIDES_TABLE)
                    .key(key)
                    .build());

            if (response.hasItem() && response.item().containsKey("payload")) {
                return response.item().get("payload").s();
            }
        } catch (Exception ex) {
            log.warn("DynamoDB getGuide failed for {}_{}: {}", gameId, guideSlug, ex.getMessage());
        }
        return null;
    }

    public List<Map<String, Object>> listGuidesForGame(String gameId) {
        log.info("Listing guides from DynamoDB for gameId={}", gameId);
        List<Map<String, Object>> list = new ArrayList<>();
        try {
            Map<String, AttributeValue> expressionValues = new HashMap<>();
            expressionValues.put(":gid", AttributeValue.builder().s(gameId).build());

            Map<String, AttributeValue> startKey = null;
            do {
                QueryRequest.Builder qb = QueryRequest.builder()
                        .tableName(DynamoDbConfig.GUIDES_TABLE)
                        .keyConditionExpression("gameId = :gid")
                        .expressionAttributeValues(expressionValues);
                if (startKey != null && !startKey.isEmpty()) {
                    qb.exclusiveStartKey(startKey);
                }
                QueryResponse response = dynamoDbClient.query(qb.build());
                for (Map<String, AttributeValue> item : response.items()) {
                    list.add(parseItemToMeta(item));
                }
                startKey = response.lastEvaluatedKey();
            } while (startKey != null && !startKey.isEmpty());

            // Self-healing fallback: If DynamoDB is empty, check Redis keys (e.g. after DynamoDB restart)
            if (list.isEmpty()) {
                try {
                    Set<String> redisKeys = redisTemplate.keys("guide:" + gameId + ":*");
                    if (redisKeys != null && !redisKeys.isEmpty()) {
                        log.info("Self-healing: Found {} guides for gameId={} in Redis. Restoring to DynamoDB...", redisKeys.size(), gameId);
                        for (String rk : redisKeys) {
                            String payload = redisTemplate.opsForValue().get(rk);
                            if (payload != null && !payload.isBlank()) {
                                String[] parts = rk.split(":", 3);
                                if (parts.length >= 3) {
                                    String slug = parts[2];
                                    String title = extractTitle(payload, slug);
                                    int count = extractTotalCount(payload);
                                    saveGuide(gameId, slug, title, count, payload);
                                }
                            }
                        }
                        QueryResponse retryRes = dynamoDbClient.query(QueryRequest.builder()
                                .tableName(DynamoDbConfig.GUIDES_TABLE)
                                .keyConditionExpression("gameId = :gid")
                                .expressionAttributeValues(expressionValues)
                                .build());
                        for (Map<String, AttributeValue> item : retryRes.items()) {
                            list.add(parseItemToMeta(item));
                        }
                    }
                } catch (Exception ex) {
                    log.warn("Redis guide recovery failed for game {}: {}", gameId, ex.getMessage());
                }
            }
        } catch (Exception ex) {
            log.warn("Failed to list guides from DynamoDB for game {}: {}", gameId, ex.getMessage());
        }
        return list;
    }

    private Map<String, Object> parseItemToMeta(Map<String, AttributeValue> item) {
        Map<String, Object> meta = new HashMap<>();
        meta.put("gameId", item.get("gameId").s());
        meta.put("guideSlug", item.get("guideSlug").s());
        meta.put("title", item.containsKey("title") ? item.get("title").s() : item.get("guideSlug").s());
        meta.put("totalCount", item.containsKey("totalCount") ? Integer.parseInt(item.get("totalCount").n()) : 0);
        meta.put("updatedAt", item.containsKey("updatedAt") ? Long.parseLong(item.get("updatedAt").n()) : 0L);

        if (item.containsKey("achievementId")) {
            meta.put("achievementId", item.get("achievementId").s());
        }
        boolean hasMap = false;
        if (item.containsKey("hasMap")) {
            hasMap = Boolean.parseBoolean(item.get("hasMap").s());
        } else if (item.containsKey("payload")) {
            hasMap = checkHasMap(item.get("payload").s());
        }
        meta.put("hasMap", hasMap);

        if (item.containsKey("payload")) {
            String payload = item.get("payload").s();
            if (!meta.containsKey("achievementId")) {
                String payloadAchId = extractAchievementId(payload);
                if (payloadAchId != null) {
                    meta.put("achievementId", payloadAchId);
                }
            }
            List<String> allAchIds = extractAllAchievementIds(payload);
            if (!allAchIds.isEmpty()) {
                meta.put("achievementIds", allAchIds);
            }
        }
        return meta;
    }

    private String extractTitle(String json, String defaultTitle) {
        if (json == null) return defaultTitle;
        Matcher m = Pattern.compile("\"title\"\\s*:\\s*\"([^\"]+)\"").matcher(json);
        if (m.find()) return m.group(1);
        return defaultTitle;
    }

    private int extractTotalCount(String json) {
        if (json == null) return 0;
        Matcher m = Pattern.compile("\"totalCount\"\\s*:\\s*(\\d+)").matcher(json);
        if (m.find()) {
            try {
                return Integer.parseInt(m.group(1));
            } catch (Exception ignored) {}
        }
        return 0;
    }

    public boolean deleteGuide(String gameId, String guideSlug) {
        try {
            Map<String, AttributeValue> key = new HashMap<>();
            key.put("gameId", AttributeValue.builder().s(gameId).build());
            key.put("guideSlug", AttributeValue.builder().s(guideSlug).build());

            dynamoDbClient.deleteItem(DeleteItemRequest.builder()
                    .tableName(DynamoDbConfig.GUIDES_TABLE)
                    .key(key)
                    .build());

            redisTemplate.delete("guide:" + gameId + ":" + guideSlug);
            redisTemplate.delete("guides:list:" + gameId);
            return true;
        } catch (Exception ex) {
            log.error("Failed to delete guide {}_{}: {}", gameId, guideSlug, ex.getMessage());
            return false;
        }
    }

    private boolean checkHasMap(String json) {
        if (json == null || json.isBlank()) return false;
        Matcher m1 = Pattern.compile("\"mapImageUrl\"\\s*:\\s*\"([^\"]+)\"").matcher(json);
        if (m1.find() && !m1.group(1).trim().isEmpty()) return true;
        Matcher m2 = Pattern.compile("\"imageUrl\"\\s*:\\s*\"([^\"]+)\"").matcher(json);
        if (m2.find() && !m2.group(1).trim().isEmpty()) return true;
        Matcher m3 = Pattern.compile("\"land\"\\s*:\\s*\"([^\"]+)\"").matcher(json);
        if (m3.find() && !m3.group(1).trim().isEmpty()) return true;
        return false;
    }
    private String extractAchievementId(String json) {
        if (json == null) return null;
        Matcher m = Pattern.compile("\"achievementId\"\\s*:\\s*\"?([^\"\\s,}\\]]+)\"?").matcher(json);
        if (m.find()) return m.group(1);
        Matcher m2 = Pattern.compile("\"relatedAchievements\"\\s*:\\s*\\[[^\\]]*\"id\"\\s*:\\s*\"?([^\"\\s,}\\]]+)\"?").matcher(json);
        if (m2.find()) return m2.group(1);
        return null;
    }

    private List<String> extractAllAchievementIds(String json) {
        List<String> ids = new ArrayList<>();
        if (json == null) return ids;
        Matcher m1 = Pattern.compile("\"achievementId\"\\s*:\\s*\"?([^\"\\s,}\\]]+)\"?").matcher(json);
        while (m1.find()) {
            String id = m1.group(1);
            if (!ids.contains(id)) ids.add(id);
        }
        Matcher relSection = Pattern.compile("\"relatedAchievements\"\\s*:\\s*\\[([^\\]]*)\\]").matcher(json);
        if (relSection.find()) {
            Matcher m2 = Pattern.compile("\"id\"\\s*:\\s*\"?([^\"\\s,}\\]]+)\"?").matcher(relSection.group(1));
            while (m2.find()) {
                String id = m2.group(1);
                if (!ids.contains(id)) ids.add(id);
            }
        }
        return ids;
    }
}
