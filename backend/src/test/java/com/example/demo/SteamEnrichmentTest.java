package com.example.demo;

import com.example.demo.service.GameCacheService;
import com.example.demo.service.RawgClientService;
import com.example.demo.service.SteamClientService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;

class SteamEnrichmentTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    @DisplayName("Given RAWG achievements missing secret items, Steam enrichment uncovers all hidden achievements")
    void testEnrichAchievementsWithSteamUncoversHidden() throws Exception {
        GameCacheService mockCache = Mockito.mock(GameCacheService.class);
        RawgClientService mockRawg = Mockito.mock(RawgClientService.class);
        SteamClientService steamService = Mockito.spy(new SteamClientService(mockCache, mockRawg));

        // Mock Steam App ID resolution
        Mockito.doReturn("{\"gameId\":\"3498\",\"steamAppId\":\"271590\",\"steamUrl\":\"https://store.steampowered.com/app/271590\"}")
                .when(steamService).resolveSteamAppId(eq("3498"), any());

        // Mock Steam full achievements containing a public and a hidden achievement
        String mockSteamAchs = "{\"appId\":\"271590\",\"count\":2,\"achievements\":[" +
                "{\"name\":\"ACH_PUBLIC\",\"displayName\":\"First Trophy\",\"description\":\"Public desc\",\"icon\":\"icon1.jpg\",\"icongray\":\"icon1.jpg\",\"percent\":85.5,\"hidden\":false}," +
                "{\"name\":\"ACH_SECRET\",\"displayName\":\"Welcome to Los Santos\",\"description\":\"\",\"icon\":\"secret.jpg\",\"icongray\":\"secret.jpg\",\"percent\":47.7,\"hidden\":true}" +
                "]}";
        Mockito.doReturn(mockSteamAchs).when(steamService).getSteamAchievements(eq("271590"));

        // RAWG only contains the public achievement (secret one is missing from RAWG)
        String rawgJson = "{\"count\":1,\"results\":[" +
                "{\"id\":101,\"name\":\"First Trophy\",\"description\":\"Public desc\",\"image\":\"rawg_icon1.jpg\",\"percent\":\"85.5\"}" +
                "]}";

        String enrichedJson = steamService.enrichAchievementsWithSteam("3498", rawgJson);
        assertNotNull(enrichedJson);

        JsonNode root = objectMapper.readTree(enrichedJson);
        assertEquals(2, root.path("count").asInt(), "Should contain 2 total achievements after enrichment");

        JsonNode results = root.path("results");
        assertEquals(2, results.size());

        // First item (from RAWG)
        JsonNode first = results.get(0);
        assertEquals("First Trophy", first.path("name").asText());
        assertFalse(first.path("hidden").asBoolean());

        // Second item (uncovered hidden achievement)
        JsonNode second = results.get(1);
        assertEquals("Welcome to Los Santos", second.path("name").asText());
        assertTrue(second.path("hidden").asBoolean());
        assertEquals("Secret storyline achievement.", second.path("description").asText());
        assertEquals("47.7", second.path("percent").asText());
    }
}
