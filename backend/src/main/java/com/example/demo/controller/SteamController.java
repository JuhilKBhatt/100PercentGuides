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
        String data = steamClientService.getSteamAchievements(appId);
        return ResponseEntity.ok(data);
    }

    /**
     * Retrieves player's live achievement unlock status for an app (for steam login game tracking).
     */
    @GetMapping(value = "/steam/player/{steamId}/achievements/{appId}", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> getPlayerAchievements(@PathVariable("steamId") String steamId,
                                                        @PathVariable("appId") String appId) {
        String data = steamClientService.getPlayerAchievements(steamId, appId);
        return ResponseEntity.ok(data);
    }

    /**
     * Retrieves list of games owned by a Steam user.
     */
    @GetMapping(value = "/steam/player/{steamId}/games", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> getPlayerOwnedGames(@PathVariable("steamId") String steamId) {
        String data = steamClientService.getOwnedGames(steamId);
        return ResponseEntity.ok(data);
    }
}
