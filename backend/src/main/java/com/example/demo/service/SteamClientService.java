package com.example.demo.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.JsonNode;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class SteamClientService {

    private static final Logger log = LoggerFactory.getLogger(SteamClientService.class);
    private static final Duration TTL_24_HOURS = Duration.ofHours(24);
    private static final Duration TTL_PLAYER_STATS = Duration.ofMinutes(15);
    private static final Duration TTL_PLAYER_GAMES = Duration.ofHours(1);

    @Value("${steam.api.key}")
    private String steamApiKey;

    @Value("${steam.api.baseUrl:https://api.steampowered.com}")
    private String baseUrl;

    private final RestClient restClient;
    private final GameCacheService gameCacheService;
    private final RawgClientService rawgClientService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    // Rate Limiter / Throttle state to respect Steam's undocumented burst limits
    private final Object rateLock = new Object();
    private long lastRequestTimeMs = 0;
    private static final long MIN_REQUEST_INTERVAL_MS = 200; // max 5 calls/sec

    public SteamClientService(GameCacheService gameCacheService, RawgClientService rawgClientService) {
        this.restClient = RestClient.builder().build();
        this.gameCacheService = gameCacheService;
        this.rawgClientService = rawgClientService;
    }

    private void throttle() {
        synchronized (rateLock) {
            long now = System.currentTimeMillis();
            long elapsed = now - lastRequestTimeMs;
            if (elapsed < MIN_REQUEST_INTERVAL_MS) {
                try {
                    Thread.sleep(MIN_REQUEST_INTERVAL_MS - elapsed);
                } catch (InterruptedException ignored) {}
            }
            lastRequestTimeMs = System.currentTimeMillis();
        }
    }

    /**
     * Resolves the Steam App ID for a given RAWG game ID and game name.
     * Stored in DynamoDB L2 and Redis L1 with 24-hour TTL.
     */
    public String resolveSteamAppId(String rawgGameId, String gameName) {
        String cacheKey = "steam:appid:" + rawgGameId;
        return gameCacheService.getOrFetch(cacheKey, TTL_24_HOURS, () -> {
            log.info("Resolving Steam App ID for RAWG gameId={}, name='{}'", rawgGameId, gameName);

            // 1. Try RAWG stores API
            try {
                String storesJson = rawgClientService.getGameStores(rawgGameId);
                String steamAppId = extractSteamAppIdFromStores(storesJson);
                if (steamAppId != null && !steamAppId.isBlank()) {
                    log.info("Found Steam App ID {} via RAWG stores for gameId={}", steamAppId, rawgGameId);
                    return buildMappingJson(rawgGameId, steamAppId);
                }
            } catch (Exception ex) {
                log.warn("RAWG stores lookup failed for gameId={}: {}", rawgGameId, ex.getMessage());
            }

            // 2. Fallback: Search Steam Store directly
            if (gameName != null && !gameName.isBlank()) {
                try {
                    throttle();
                    String cleanName = gameName.replaceAll("[^a-zA-Z0-9 ]", "").trim();
                    String encoded = URLEncoder.encode(cleanName, StandardCharsets.UTF_8);
                    String searchUrl = "https://store.steampowered.com/api/storesearch/?term=" + encoded + "&l=english&cc=US";

                    String searchResponse = restClient.get()
                            .uri(searchUrl)
                            .header("User-Agent", "100PercentGuides/1.0")
                            .retrieve()
                            .body(String.class);

                    if (searchResponse != null) {
                        Pattern idPattern = Pattern.compile("\"id\"\\s*:\\s*(\\d+)");
                        Matcher m = idPattern.matcher(searchResponse);
                        if (m.find()) {
                            String foundId = m.group(1);
                            log.info("Found Steam App ID {} via Steam Store Search for '{}'", foundId, gameName);
                            return buildMappingJson(rawgGameId, foundId);
                        }
                    }
                } catch (Exception ex) {
                    log.warn("Steam Store Search fallback failed for '{}': {}", gameName, ex.getMessage());
                }
            }

            // Return empty mapping if not found
            return "{\"gameId\":\"" + rawgGameId + "\",\"steamAppId\":null,\"steamUrl\":null}";
        });
    }

    /**
     * Extracts Steam App ID from RAWG stores JSON payload.
     * Looks for store_id 1 (Steam) and regex extracts /app/{id}.
     */
    public String extractSteamAppIdFromStores(String storesJson) {
        if (storesJson == null || storesJson.isBlank()) return null;

        // Check if store_id: 1 is present
        Pattern steamStorePattern = Pattern.compile("\"store_id\"\\s*:\\s*1[^}]*?\"url\"\\s*:\\s*\"([^\"]*)\"");
        Matcher matcher = steamStorePattern.matcher(storesJson);
        if (matcher.find()) {
            String url = matcher.group(1);
            Matcher appMatcher = Pattern.compile("/app/(\\d+)").matcher(url);
            if (appMatcher.find()) {
                return appMatcher.group(1);
            }
        }

        // Alternative pattern where url precedes store_id
        Pattern altPattern = Pattern.compile("\"url\"\\s*:\\s*\"([^\"]*store\\.steampowered\\.com/app/(\\d+)[^\"]*)\"");
        Matcher altMatcher = altPattern.matcher(storesJson);
        if (altMatcher.find()) {
            return altMatcher.group(2);
        }

        return null;
    }

    /**
     * Retrieves full Steam achievements with global unlock percentages.
     * Cached in Redis L1 and DynamoDB L2 with 24-hour TTL.
     */
    public String getSteamAchievements(String appId) {
        String cacheKey = "steam:achievements:" + appId;
        return gameCacheService.getOrFetch(cacheKey, TTL_24_HOURS, () -> {
            log.info("Fetching official Steam achievements for appId={}", appId);
            try {
                // 1. Fetch Schema (achievement names, icons, descriptions)
                throttle();
                String schemaUrl = baseUrl + "/ISteamUserStats/GetSchemaForGame/v2/?key={key}&appid={appId}";
                String schemaJson = restClient.get()
                        .uri(schemaUrl, steamApiKey, appId)
                        .retrieve()
                        .body(String.class);

                // 2. Fetch Global Percentages
                throttle();
                String ratesUrl = baseUrl + "/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v0002/?gameid={appId}";
                String ratesJson = restClient.get()
                        .uri(ratesUrl, appId)
                        .retrieve()
                        .body(String.class);

                // Merge and format cleanly
                return mergeSteamAchievements(appId, schemaJson, ratesJson);
            } catch (Exception ex) {
                log.error("Failed to fetch Steam achievements for appId={}: {}", appId, ex.getMessage(), ex);
                return "{\"appId\":\"" + appId + "\",\"count\":0,\"achievements\":[]}";
            }
        });
    }

    /**
     * Retrieves player's live achievement unlock status for an app.
     * Multi-tier cached with 15-minute TTL to protect Steam rate limits while supporting live tracking.
     */
    public String getPlayerAchievements(String steamId, String appId) {
        String cacheKey = "steam:player:" + steamId + ":" + appId;
        return gameCacheService.getOrFetch(cacheKey, TTL_PLAYER_STATS, () -> {
            log.info("Fetching player achievements from Steam: steamId={}, appId={}", steamId, appId);
            try {
                throttle();
                String url = baseUrl + "/ISteamUserStats/GetPlayerAchievements/v1/?key={key}&steamid={steamId}&appid={appId}";
                String response = restClient.get()
                        .uri(url, steamApiKey, steamId, appId)
                        .retrieve()
                        .body(String.class);

                return response != null ? response : "{\"playerstats\":{\"success\":false,\"error\":\"No data returned\"}}";
            } catch (Exception ex) {
                log.error("Failed to fetch player achievements for steamId={}, appId={}: {}", steamId, appId, ex.getMessage());
                return "{\"playerstats\":{\"success\":false,\"error\":\"" + escapeJson(ex.getMessage()) + "\"}}";
            }
        });
    }

    /**
     * Retrieves list of owned Steam games for a player.
     * Cached with 1-hour TTL in Redis and DynamoDB.
     */
    public String getOwnedGames(String steamId) {
        String cacheKey = "steam:player:" + steamId + ":games";
        return gameCacheService.getOrFetch(cacheKey, TTL_PLAYER_GAMES, () -> {
            log.info("Fetching owned games from Steam for steamId={}", steamId);
            try {
                throttle();
                String url = baseUrl + "/IPlayerService/GetOwnedGames/v0001/?key={key}&steamid={steamId}&include_appinfo=1&include_played_free_games=1&format=json";
                String response = restClient.get()
                        .uri(url, steamApiKey, steamId)
                        .retrieve()
                        .body(String.class);

                return response != null ? response : "{\"response\":{\"game_count\":0,\"games\":[]}}";
            } catch (Exception ex) {
                log.error("Failed to fetch owned games for steamId={}: {}", steamId, ex.getMessage());
                return "{\"response\":{\"game_count\":0,\"games\":[],\"error\":\"" + escapeJson(ex.getMessage()) + "\"}}";
            }
        });
    }

    /**
     * Retrieves player's public profile summary (persona name, avatar, profile url).
     * Multi-tier cached with 15-minute TTL.
     */
    public String getPlayerSummary(String steamId) {
        String cacheKey = "steam:player:" + steamId + ":summary";
        return gameCacheService.getOrFetch(cacheKey, TTL_PLAYER_STATS, () -> {
            log.info("Fetching player summary from Steam for steamId={}", steamId);
            try {
                throttle();
                String url = baseUrl + "/ISteamUser/GetPlayerSummaries/v0002/?key={key}&steamids={steamId}";
                String response = restClient.get()
                        .uri(url, steamApiKey, steamId)
                        .retrieve()
                        .body(String.class);

                return response != null ? response : "{\"response\":{\"players\":[]}}";
            } catch (Exception ex) {
                log.error("Failed to fetch player summary for steamId={}: {}", steamId, ex.getMessage());
                return "{\"response\":{\"players\":[],\"error\":\"" + escapeJson(ex.getMessage()) + "\"}}";
            }
        });
    }

    /**
     * Resolves a Steam Vanity URL (custom profile name) into a 64-bit Steam ID.
     */
    public String resolveVanityUrl(String vanityUrl) {
        if (vanityUrl == null || vanityUrl.isBlank()) {
            return "{\"response\":{\"success\":42,\"error\":\"Empty vanity URL\"}}";
        }

        String clean = vanityUrl.trim();
        if (clean.contains("/id/")) {
            clean = clean.substring(clean.indexOf("/id/") + 4);
        }
        if (clean.contains("/profiles/")) {
            clean = clean.substring(clean.indexOf("/profiles/") + 10);
        }
        if (clean.endsWith("/")) {
            clean = clean.substring(0, clean.length() - 1);
        }

        // If it's already a numeric 17-digit Steam ID64, return it directly
        if (clean.matches("^7656119\\d{10}$")) {
            return "{\"response\":{\"steamid\":\"" + clean + "\",\"success\":1}}";
        }

        final String finalVanity = clean;
        String cacheKey = "steam:vanity:" + finalVanity;
        return gameCacheService.getOrFetch(cacheKey, TTL_24_HOURS, () -> {
            log.info("Resolving vanity URL for: {}", finalVanity);
            try {
                throttle();
                String url = baseUrl + "/ISteamUser/ResolveVanityURL/v0001/?key={key}&vanityurl={vanity}";
                String response = restClient.get()
                        .uri(url, steamApiKey, finalVanity)
                        .retrieve()
                        .body(String.class);

                return response != null ? response : "{\"response\":{\"success\":42}}";
            } catch (Exception ex) {
                log.error("Failed to resolve vanity URL for {}: {}", finalVanity, ex.getMessage());
                return "{\"response\":{\"success\":42,\"error\":\"" + escapeJson(ex.getMessage()) + "\"}}";
            }
        });
    }

    public String cleanAchievementName(String name) {
        if (name == null) return "";
        return name.replace(' ', ' ')
                   .replace('​', ' ')
                   .replaceAll("\s+", " ")
                   .strip();
    }

    public String canonicalKey(String name) {
        if (name == null) return "";
        return cleanAchievementName(name)
                .replaceAll("[^a-zA-Z0-9]", "")
                .toLowerCase(Locale.ROOT);
    }

    /**
     * Enriches RAWG achievements with Steam achievements, uncovering all hidden/secret achievements
     * while guaranteeing strict deduplication across Unicode whitespace, punctuation variations,
     * and Steam API names.
     */
    public String enrichAchievementsWithSteam(String gameId, String rawgJson) {
        if (rawgJson == null || rawgJson.isBlank()) {
            return "{\"count\":0,\"results\":[]}";
        }

        try {
            // 1. Resolve Steam App ID for this game
            String mappingJson = resolveSteamAppId(gameId, null);
            JsonNode mappingNode = objectMapper.readTree(mappingJson);
            String steamAppId = mappingNode.path("steamAppId").asText(null);
            if (steamAppId == null || steamAppId.isBlank()) {
                return sanitizeAchievementsJson(rawgJson);
            }

            // 2. Fetch full Steam achievements (which include all hidden: 1 achievements)
            String steamAchsJson = getSteamAchievements(steamAppId);
            if (steamAchsJson == null || steamAchsJson.isBlank()) {
                return sanitizeAchievementsJson(rawgJson);
            }

            JsonNode steamRoot = objectMapper.readTree(steamAchsJson);
            JsonNode steamAchs = steamRoot.path("achievements");
            if (!steamAchs.isArray() || steamAchs.isEmpty()) {
                return sanitizeAchievementsJson(rawgJson);
            }

            Map<String, JsonNode> steamMapByCleanName = new LinkedHashMap<>();
            Map<String, JsonNode> steamMapByCanonical = new LinkedHashMap<>();
            Map<String, JsonNode> steamMapByApiName = new LinkedHashMap<>();

            for (JsonNode ach : steamAchs) {
                String rawDisplayName = ach.path("displayName").asText("");
                String cleanName = cleanAchievementName(rawDisplayName).toLowerCase(Locale.ROOT);
                String canon = canonicalKey(rawDisplayName);
                String apiName = ach.path("name").asText("").trim();

                if (!cleanName.isEmpty()) {
                    steamMapByCleanName.put(cleanName, ach);
                }
                if (!canon.isEmpty()) {
                    steamMapByCanonical.put(canon, ach);
                }
                if (!apiName.isEmpty()) {
                    steamMapByApiName.put(apiName, ach);
                }
            }

            // 3. Parse RAWG achievements with internal deduplication
            JsonNode rawgRoot = objectMapper.readTree(rawgJson);
            JsonNode rawgResults = rawgRoot.path("results");
            List<Map<String, Object>> combinedResults = new ArrayList<>();
            Set<String> matchedSteamIdentifiers = new HashSet<>();
            Set<String> seenCanons = new HashSet<>();

            if (rawgResults.isArray()) {
                for (JsonNode item : rawgResults) {
                    int id = item.path("id").asInt();
                    String rawName = item.path("name").asText("");
                    String cleanName = cleanAchievementName(rawName);
                    String canon = canonicalKey(rawName);
                    String existingSteamApiName = item.path("steamApiName").asText("").trim();

                    // Deduplicate within RAWG results (e.g. from pagination overlaps)
                    if (canon.isEmpty() || !seenCanons.add(canon)) {
                        continue;
                    }

                    String description = item.path("description").asText("");
                    String image = item.path("image").asText("");
                    String percent = item.has("percent") ? item.path("percent").asText("0.0") : "0.0";
                    boolean hidden = false;

                    // Match against Steam
                    JsonNode steamMatch = null;
                    if (!existingSteamApiName.isEmpty()) {
                        steamMatch = steamMapByApiName.get(existingSteamApiName);
                    }
                    if (steamMatch == null) {
                        steamMatch = steamMapByCleanName.get(cleanName.toLowerCase(Locale.ROOT));
                    }
                    if (steamMatch == null) {
                        steamMatch = steamMapByCanonical.get(canon);
                    }

                    // If official Steam achievements are present, omit non-Steam achievements (e.g. PlayStation Platinum trophies)
                    if (steamMatch == null && existingSteamApiName.isEmpty() && !steamAchs.isEmpty()) {
                        continue;
                    }

                    if (steamMatch != null) {
                        String steamRawDisplayName = steamMatch.path("displayName").asText("");
                        matchedSteamIdentifiers.add(cleanAchievementName(steamRawDisplayName).toLowerCase(Locale.ROOT));
                        matchedSteamIdentifiers.add(canonicalKey(steamRawDisplayName));
                        if (steamMatch.has("name")) {
                            matchedSteamIdentifiers.add(steamMatch.path("name").asText("").trim());
                        }

                        hidden = steamMatch.path("hidden").asBoolean(false);
                        // If RAWG percent is 0.0 or missing, take Steam percent
                        if (("0.0".equals(percent) || "0".equals(percent)) && steamMatch.has("percent")) {
                            percent = steamMatch.path("percent").asText();
                        }
                    }

                    Map<String, Object> map = new LinkedHashMap<>();
                    map.put("id", id);
                    map.put("name", cleanName);
                    map.put("description", description);
                    map.put("image", image);
                    map.put("percent", percent);
                    map.put("hidden", hidden);
                    if (steamMatch != null && steamMatch.has("name")) {
                        map.put("steamApiName", steamMatch.path("name").asText("").trim());
                    } else if (!existingSteamApiName.isEmpty()) {
                        map.put("steamApiName", existingSteamApiName);
                    }
                    combinedResults.add(map);
                }
            }

            // 4. Append all Steam achievements that RAWG omitted (hidden / secret storyline achievements)
            int fakeIdCounter = 900000;
            for (JsonNode steamAch : steamAchs) {
                String rawDisplayName = steamAch.path("displayName").asText("");
                String cleanName = cleanAchievementName(rawDisplayName);
                String canon = canonicalKey(rawDisplayName);
                String apiName = steamAch.path("name").asText("").trim();

                // Skip if already matched by name, canonical key, or steam API name
                if (matchedSteamIdentifiers.contains(cleanName.toLowerCase(Locale.ROOT))
                        || matchedSteamIdentifiers.contains(canon)
                        || (!apiName.isEmpty() && matchedSteamIdentifiers.contains(apiName))
                        || seenCanons.contains(canon)) {
                    continue;
                }

                seenCanons.add(canon);
                if (!apiName.isEmpty()) {
                    matchedSteamIdentifiers.add(apiName);
                }

                String desc = steamAch.path("description").asText("");
                if (desc.isBlank()) {
                    desc = "Secret storyline achievement.";
                }
                String icon = steamAch.path("icon").asText("");
                String percent = steamAch.path("percent").asText("0.0");
                boolean hidden = steamAch.path("hidden").asBoolean(true); // default true for omitted achievements

                Map<String, Object> map = new LinkedHashMap<>();
                map.put("id", fakeIdCounter++);
                map.put("name", cleanName);
                map.put("description", desc);
                map.put("image", icon);
                map.put("percent", percent);
                map.put("hidden", hidden);
                if (!apiName.isEmpty()) {
                    map.put("steamApiName", apiName);
                }
                combinedResults.add(map);
            }

            // 5. Final deduplication pass to ensure 100% unique items
            return buildDeduplicatedOutput(combinedResults);

        } catch (Exception ex) {
            log.error("Failed to enrich achievements with Steam for gameId={}: {}", gameId, ex.getMessage(), ex);
            return sanitizeAchievementsJson(rawgJson);
        }
    }

    /**
     * Sanitizes and strictly deduplicates an achievements JSON string.
     */
    public String sanitizeAchievementsJson(String achievementsJson) {
        if (achievementsJson == null || achievementsJson.isBlank()) {
            return "{\"count\":0,\"results\":[]}";
        }
        try {
            JsonNode root = objectMapper.readTree(achievementsJson);
            JsonNode results = root.path("results");
            if (!results.isArray()) {
                return achievementsJson;
            }

            List<Map<String, Object>> items = new ArrayList<>();
            for (JsonNode item : results) {
                Map<String, Object> map = new LinkedHashMap<>();
                map.put("id", item.path("id").asInt());
                map.put("name", cleanAchievementName(item.path("name").asText("")));
                map.put("description", item.path("description").asText(""));
                map.put("image", item.path("image").asText(""));
                map.put("percent", item.has("percent") ? item.path("percent").asText("0.0") : "0.0");
                map.put("hidden", item.path("hidden").asBoolean(false));
                if (item.has("steamApiName")) {
                    map.put("steamApiName", item.path("steamApiName").asText("").trim());
                }
                items.add(map);
            }

            return buildDeduplicatedOutput(items);
        } catch (Exception ex) {
            log.warn("Failed to sanitize achievements JSON: {}", ex.getMessage());
            return achievementsJson;
        }
    }

    private String buildDeduplicatedOutput(List<Map<String, Object>> items) throws Exception {
        List<Map<String, Object>> deduped = new ArrayList<>();
        Set<String> seenCanons = new HashSet<>();
        Set<String> seenApiNames = new HashSet<>();

        for (Map<String, Object> item : items) {
            String name = cleanAchievementName((String) item.get("name"));
            String canon = canonicalKey(name);
            String apiName = (String) item.get("steamApiName");

            if (!canon.isEmpty() && seenCanons.contains(canon)) {
                continue;
            }
            if (apiName != null && !apiName.isEmpty() && seenApiNames.contains(apiName)) {
                continue;
            }

            if (!canon.isEmpty()) seenCanons.add(canon);
            if (apiName != null && !apiName.isEmpty()) seenApiNames.add(apiName);
            item.put("name", name);
            deduped.add(item);
        }

        Map<String, Object> output = new LinkedHashMap<>();
        output.put("count", deduped.size());
        output.put("results", deduped);
        return objectMapper.writeValueAsString(output);
    }

    /**
     * Merges schema achievements and global unlock rates into unified JSON.
     */
    private String mergeSteamAchievements(String appId, String schemaJson, String ratesJson) {
        Map<String, String> percentages = new HashMap<>();
        if (ratesJson != null && !ratesJson.isBlank()) {
            try {
                JsonNode root = objectMapper.readTree(ratesJson);
                JsonNode achs = root.path("achievementpercentages").path("achievements");
                if (achs.isArray()) {
                    for (JsonNode node : achs) {
                        percentages.put(node.path("name").asText(), String.format(Locale.US, "%.2f", node.path("percent").asDouble(0.0)));
                    }
                }
            } catch (Exception e) {
                log.warn("Failed to parse ratesJson for appId={}: {}", appId, e.getMessage());
            }
        }

        List<Map<String, Object>> items = new ArrayList<>();
        if (schemaJson != null && !schemaJson.isBlank()) {
            try {
                JsonNode root = objectMapper.readTree(schemaJson);
                JsonNode achs = root.path("game").path("availableGameStats").path("achievements");
                if (achs.isArray()) {
                    for (JsonNode ach : achs) {
                        String apiName = ach.path("name").asText();
                        String displayName = ach.has("displayName") ? ach.path("displayName").asText() : apiName;
                        String description = ach.has("description") ? ach.path("description").asText() : "";
                        String icon = ach.path("icon").asText("");
                        String icongray = ach.path("icongray").asText(icon);
                        boolean hidden = ach.path("hidden").asInt(0) == 1;
                        String percent = percentages.getOrDefault(apiName, "0.00");

                        Map<String, Object> map = new LinkedHashMap<>();
                        map.put("name", apiName);
                        map.put("displayName", displayName);
                        map.put("description", description);
                        map.put("icon", icon);
                        map.put("icongray", icongray);
                        map.put("percent", percent);
                        map.put("hidden", hidden);
                        items.add(map);
                    }
                }
            } catch (Exception e) {
                log.warn("Failed to parse schemaJson for appId={}: {}", appId, e.getMessage());
            }
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("appId", appId);
        response.put("count", items.size());
        response.put("achievements", items);
        try {
            return objectMapper.writeValueAsString(response);
        } catch (Exception e) {
            return "{\"appId\":\"" + appId + "\",\"count\":0,\"achievements\":[]}";
        }
    }

    private String buildMappingJson(String gameId, String steamAppId) {
        return "{\"gameId\":\"" + gameId + "\",\"steamAppId\":\"" + steamAppId + "\",\"steamUrl\":\"https://store.steampowered.com/app/" + steamAppId + "\"}";
    }

    private String extractString(String block, String key) {
        Matcher m = Pattern.compile("\"" + key + "\"\\s*:\\s*\"([^\"]*)\"").matcher(block);
        return m.find() ? m.group(1) : null;
    }

    private String escapeJson(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", " ").replace("\r", "");
    }
}
