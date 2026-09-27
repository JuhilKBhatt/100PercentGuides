package com.example.demo.controller;

import com.example.demo.service.GuideService;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/games/{gameId}/guides")
public class GuideController {

    private final GuideService guideService;

    public GuideController(GuideService guideService) {
        this.guideService = guideService;
    }

    /**
     * Lists all guides for a game from DynamoDB.
     */
    @GetMapping(produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<List<Map<String, Object>>> listGuides(@PathVariable("gameId") String gameId) {
        List<Map<String, Object>> guides = guideService.listGuidesForGame(gameId);
        return ResponseEntity.ok(guides);
    }

    /**
     * Retrieves a single guide with map locations from DynamoDB.
     */
    @GetMapping(value = "/{guideSlug}", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> getGuide(@PathVariable("gameId") String gameId,
                                           @PathVariable("guideSlug") String guideSlug) {
        String guideJson = guideService.getGuide(gameId, guideSlug);
        if (guideJson == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(guideJson);
    }

    /**
     * Saves or creates a new guide with its map locations into DynamoDB.
     */
    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Map<String, Object>> createOrUpdateGuide(@PathVariable("gameId") String gameId,
                                                                   @RequestBody String payloadJson) {
        String guideSlug = extractString(payloadJson, "guideSlug");
        String title = extractString(payloadJson, "title");
        int totalCount = extractInt(payloadJson, "totalCount");

        if (guideSlug == null || guideSlug.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "guideSlug is required"));
        }

        boolean saved = guideService.saveGuide(gameId, guideSlug, title != null ? title : guideSlug, totalCount, payloadJson);
        if (!saved) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to save guide to DynamoDB"));
        }

        return ResponseEntity.ok(Map.of(
                "success", true,
                "gameId", gameId,
                "guideSlug", guideSlug,
                "message", "Guide saved to DynamoDB successfully"
        ));
    }

    /**
     * Deletes a guide from DynamoDB.
     */
    @DeleteMapping(value = "/{guideSlug}", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Map<String, Object>> deleteGuide(@PathVariable("gameId") String gameId,
                                                           @PathVariable("guideSlug") String guideSlug) {
        boolean deleted = guideService.deleteGuide(gameId, guideSlug);
        return ResponseEntity.ok(Map.of("success", deleted, "guideSlug", guideSlug));
    }

    private String extractString(String json, String key) {
        Matcher m = Pattern.compile("\"" + key + "\"\\s*:\\s*\"([^\"]+)\"").matcher(json);
        return m.find() ? m.group(1) : null;
    }

    private int extractInt(String json, String key) {
        Matcher m = Pattern.compile("\"" + key + "\"\\s*:\\s*(\\d+)").matcher(json);
        return m.find() ? Integer.parseInt(m.group(1)) : 0;
    }
}
