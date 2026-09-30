package com.example.demo.controller;

import com.example.demo.service.GuideService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/games/{gameId}/guides")
public class GuideController {

    private static final Logger log = LoggerFactory.getLogger(GuideController.class);
    private static final Pattern SAFE_IDENTIFIER = Pattern.compile("^[a-zA-Z0-9_-]{1,64}$");
    private static final int MAX_PAYLOAD_BYTES = 2 * 1024 * 1024; // 2 MB maximum guide payload

    private final GuideService guideService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public GuideController(GuideService guideService) {
        this.guideService = guideService;
    }

    /**
     * Lists all guides for a game from DynamoDB.
     */
    @GetMapping(produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> listGuides(@PathVariable("gameId") String gameId) {
        if (!isValidIdentifier(gameId)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid gameId format"));
        }
        List<Map<String, Object>> guides = guideService.listGuidesForGame(gameId);
        return ResponseEntity.ok(guides);
    }

    /**
     * Retrieves a single guide with map locations from DynamoDB.
     */
    @GetMapping(value = "/{guideSlug}", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> getGuide(@PathVariable("gameId") String gameId,
                                      @PathVariable("guideSlug") String guideSlug) {
        if (!isValidIdentifier(gameId) || !isValidIdentifier(guideSlug)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid gameId or guideSlug format"));
        }
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
        if (!isValidIdentifier(gameId)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid gameId format"));
        }

        if (payloadJson == null || payloadJson.length() > MAX_PAYLOAD_BYTES) {
            return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE)
                    .body(Map.of("error", "Payload exceeds maximum allowed size (2MB)"));
        }

        String guideSlug;
        String title;
        int totalCount = 0;

        try {
            JsonNode root = objectMapper.readTree(payloadJson);
            guideSlug = root.path("guideSlug").asText(null);
            title = root.path("title").asText(null);
            totalCount = root.path("totalCount").asInt(0);
        } catch (Exception e) {
            log.warn("Invalid JSON submitted to createOrUpdateGuide: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", "Malformed JSON payload"));
        }

        if (guideSlug == null || guideSlug.isBlank() || !isValidIdentifier(guideSlug)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Valid guideSlug is required (alphanumeric, hyphens, underscores)"));
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
        if (!isValidIdentifier(gameId) || !isValidIdentifier(guideSlug)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid gameId or guideSlug format"));
        }
        boolean deleted = guideService.deleteGuide(gameId, guideSlug);
        return ResponseEntity.ok(Map.of("success", deleted, "guideSlug", guideSlug));
    }

    private boolean isValidIdentifier(String s) {
        return s != null && SAFE_IDENTIFIER.matcher(s).matches();
    }
}
