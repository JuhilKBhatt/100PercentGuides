package com.example.demo.controller;

import com.example.demo.service.RawgClientService;
import com.example.demo.service.SteamClientService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api")
public class SteamController {

    private static final Pattern SAFE_ID = Pattern.compile("^[a-zA-Z0-9_-]{1,64}$");
    private static final Pattern STEAM_ID64 = Pattern.compile("^\\d{17}$");

    private final SteamClientService steamClientService;
    private final RawgClientService rawgClientService;

    public SteamController(SteamClientService steamClientService, RawgClientService rawgClientService) {
        this.steamClientService = steamClientService;
        this.rawgClientService = rawgClientService;
    }

    /**
     * Resolves the Steam App ID and store URL for a given RAWG game ID.
     */
    @GetMapping(value = "/games/{id}/steam", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> getGameSteamMapping(@PathVariable("id") String id,
                                                      @RequestParam(value = "name", required = false) String name) {
        if (!SAFE_ID.matcher(id).matches()) {
            return ResponseEntity.badRequest().body("{\"error\":\"Invalid id format\"}");
        }
        String resolvedName = name;
        if (resolvedName == null || resolvedName.isBlank()) {
            try {
                String detailsJson = rawgClientService.getGameDetails(id);
                Matcher m = Pattern.compile("\"name\"\\s*:\\s*\"([^\"]+)\"").matcher(detailsJson);
                if (m.find()) {
                    resolvedName = m.group(1);
                }
            } catch (Exception ignored) {}
        }

        String mappingJson = steamClientService.resolveSteamAppId(id, resolvedName);
        return ResponseEntity.ok(mappingJson);
    }

    /**
     * Retrieves official Steam achievements with global unlock percentages for a Steam App ID.
     */
    @GetMapping(value = "/steam/app/{appId}/achievements", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> getSteamAchievements(@PathVariable("appId") String appId) {
        if (!SAFE_ID.matcher(appId).matches()) {
            return ResponseEntity.badRequest().body("{\"error\":\"Invalid appId format\"}");
        }
        String data = steamClientService.getSteamAchievements(appId);
        return ResponseEntity.ok(data);
    }

    /**
     * Retrieves player's live achievement unlock status for an app (for steam login game tracking).
     */
    @GetMapping(value = "/steam/player/{steamId}/achievements/{appId}", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> getPlayerAchievements(@PathVariable("steamId") String steamId,
                                                        @PathVariable("appId") String appId) {
        if (!STEAM_ID64.matcher(steamId).matches() || !SAFE_ID.matcher(appId).matches()) {
            return ResponseEntity.badRequest().body("{\"error\":\"Invalid steamId or appId format\"}");
        }
        String data = steamClientService.getPlayerAchievements(steamId, appId);
        return ResponseEntity.ok(data);
    }

    /**
     * Retrieves list of games owned by a Steam user.
     */
    @GetMapping(value = "/steam/player/{steamId}/games", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> getPlayerOwnedGames(@PathVariable("steamId") String steamId) {
        if (!STEAM_ID64.matcher(steamId).matches()) {
            return ResponseEntity.badRequest().body("{\"error\":\"Invalid steamId format\"}");
        }
        String data = steamClientService.getOwnedGames(steamId);
        return ResponseEntity.ok(data);
    }

    /**
     * Retrieves player's public profile summary (persona name, avatar, profile url).
     */
    @GetMapping(value = "/steam/player/{steamId}/summary", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> getPlayerSummary(@PathVariable("steamId") String steamId) {
        if (!STEAM_ID64.matcher(steamId).matches()) {
            return ResponseEntity.badRequest().body("{\"error\":\"Invalid steamId format\"}");
        }
        String data = steamClientService.getPlayerSummary(steamId);
        return ResponseEntity.ok(data);
    }

    /**
     * Resolves a Steam Vanity URL (custom profile name) into a 64-bit Steam ID.
     */
    @GetMapping(value = "/steam/resolve-vanity", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> resolveVanityUrl(@RequestParam("url") String url) {
        String cleanUrl = url.trim();
        if (cleanUrl.length() > 200) {
            return ResponseEntity.badRequest().body("{\"error\":\"URL parameter exceeds maximum length\"}");
        }
        String data = steamClientService.resolveVanityUrl(url);
        return ResponseEntity.ok(data);
    }
}
