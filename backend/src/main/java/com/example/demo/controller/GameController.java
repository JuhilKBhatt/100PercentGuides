package com.example.demo.controller;

import com.example.demo.service.GameCacheService;
import com.example.demo.service.GameChecklistService;
import com.example.demo.service.RawgClientService;
import com.example.demo.service.SteamClientService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/games")
public class GameController {

    private static final Logger log = LoggerFactory.getLogger(GameController.class);
    private static final Duration TTL_24_HOURS = Duration.ofHours(24);

    private final RawgClientService rawgClientService;
    private final GameCacheService gameCacheService;
    private final GameChecklistService gameChecklistService;
    private final SteamClientService steamClientService;

    public GameController(RawgClientService rawgClientService, 
                          GameCacheService gameCacheService,
                          GameChecklistService gameChecklistService,
                          SteamClientService steamClientService) {
        this.rawgClientService = rawgClientService;
        this.gameCacheService = gameCacheService;
        this.gameChecklistService = gameChecklistService;
        this.steamClientService = steamClientService;
    }

    @GetMapping(value = "/search", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> search(@RequestParam(value = "q", defaultValue = "") String query) {
        if (query.trim().length() < 2) {
            return ResponseEntity.ok("{\"results\":[]}");
        }
        String cacheKey = "search:" + query.trim().toLowerCase();
        String data = gameCacheService.getOrFetch(cacheKey, TTL_24_HOURS, () -> rawgClientService.searchGames(query));
        return ResponseEntity.ok(data);
    }

    @GetMapping(value = "/recent", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> getRecent() {
        String cacheKey = "games:recent";
        String data = gameCacheService.getOrFetch(cacheKey, TTL_24_HOURS, rawgClientService::getRecentGames);
        return ResponseEntity.ok(data);
    }

    @GetMapping(value = "/{id}", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> getDetails(@PathVariable("id") String id) {
        String cacheKey = "game:details:" + id;
        String data = gameCacheService.getOrFetch(cacheKey, TTL_24_HOURS, () -> {
            String details = rawgClientService.getGameDetails(id);
            return enrichWithSteamData(id, details);
        });

        // If previously cached without steamAppId, enrich and return
        if (!data.contains("\"steamAppId\"")) {
            data = enrichWithSteamData(id, data);
        }
        return ResponseEntity.ok(data);
    }

    @GetMapping(value = "/{id}/achievements", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> getAchievements(
            @PathVariable("id") String id,
            @RequestParam(value = "refresh", required = false, defaultValue = "false") boolean refresh) {
        String cacheKey = "game:achievements:" + id;

        if (refresh) {
            gameCacheService.evict(cacheKey);
        }

        String data = gameCacheService.getOrFetch(cacheKey, TTL_24_HOURS, () -> {
            String rawgJson = rawgClientService.getGameAchievements(id);
            return steamClientService.enrichAchievementsWithSteam(id, rawgJson);
        });

        // Ensure cached data is strictly sanitized and deduplicated
        String sanitized = steamClientService.sanitizeAchievementsJson(data);

        // If data was dirty/had duplicates, or missing hidden flag, update cache with clean version
        if (!sanitized.equals(data) || !data.contains("\"hidden\"")) {
            gameCacheService.put(cacheKey, sanitized, TTL_24_HOURS);
            data = sanitized;
        }

        return ResponseEntity.ok(data);
    }

    @GetMapping(value = "/{id}/checklist", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> getChecklist(@PathVariable("id") String id) {
        String cacheKey = "game:checklist:" + id;
        String data = gameCacheService.getOrFetch(cacheKey, TTL_24_HOURS, () -> gameChecklistService.getGameChecklist(id));
        return ResponseEntity.ok(data);
    }

    private String enrichWithSteamData(String id, String detailsJson) {
        if (detailsJson == null || detailsJson.isBlank() || detailsJson.contains("\"steamAppId\"")) {
            return detailsJson;
        }
        try {
            Matcher m = Pattern.compile("\"name\"\\s*:\\s*\"([^\"]+)\"").matcher(detailsJson);
            String name = m.find() ? m.group(1) : "";
            String mappingJson = steamClientService.resolveSteamAppId(id, name);
            Matcher idMatcher = Pattern.compile("\"steamAppId\"\\s*:\\s*\"?(\\d+)\"?").matcher(mappingJson);
            if (idMatcher.find()) {
                String steamAppId = idMatcher.group(1);
                int lastBrace = detailsJson.lastIndexOf("}");
                if (lastBrace != -1) {
                    return detailsJson.substring(0, lastBrace) + 
                           ",\"steamAppId\":\"" + steamAppId + "\"" + 
                           ",\"steamUrl\":\"https://store.steampowered.com/app/" + steamAppId + "\"}";
                }
            }
        } catch (Exception ex) {
            log.warn("Failed to enrich game details with Steam data for id={}: {}", id, ex.getMessage());
        }
        return detailsJson;
    }
}
