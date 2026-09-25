package com.example.demo.controller;

import com.example.demo.service.GameCacheService;
import com.example.demo.service.RawgClientService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;

@RestController
@RequestMapping("/api/games")
public class GameController {

    // 24-hour TTL for search and loading results
    private static final Duration TTL_24_HOURS = Duration.ofHours(24);

    private final RawgClientService rawgClientService;
    private final GameCacheService gameCacheService;

    public GameController(RawgClientService rawgClientService, GameCacheService gameCacheService) {
        this.rawgClientService = rawgClientService;
        this.gameCacheService = gameCacheService;
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
        String data = gameCacheService.getOrFetch(cacheKey, TTL_24_HOURS, () -> rawgClientService.getGameDetails(id));
        return ResponseEntity.ok(data);
    }

    @GetMapping(value = "/{id}/achievements", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> getAchievements(@PathVariable("id") String id) {
        String cacheKey = "game:achievements:" + id;
        String data = gameCacheService.getOrFetch(cacheKey, TTL_24_HOURS, () -> rawgClientService.getGameAchievements(id));
        return ResponseEntity.ok(data);
    }
}
