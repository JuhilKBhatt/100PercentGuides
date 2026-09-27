package com.example.demo.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class RawgClientService {

    private static final Logger log = LoggerFactory.getLogger(RawgClientService.class);

    @Value("${rawg.api.key}")
    private String rawgApiKey;

    @Value("${rawg.api.baseUrl:https://api.rawg.io/api}")
    private String baseUrl;

    private final RestClient restClient;

    public RawgClientService() {
        this.restClient = RestClient.builder().build();
    }

    public String searchGames(String query) {
        log.info("Calling RAWG API: search games for query={}", query);
        return restClient.get()
                .uri(baseUrl + "/games?search={q}&key={key}&page_size=6", query, rawgApiKey)
                .retrieve()
                .body(String.class);
    }

    public String getRecentGames() {
        LocalDate today = LocalDate.now();
        LocalDate lastMonth = today.minusDays(30);
        String dates = lastMonth + "," + today;
        log.info("Calling RAWG API: recent games for dates={}", dates);
        return restClient.get()
                .uri(baseUrl + "/games?dates={dates}&ordering=-released&key={key}&page_size=6", dates, rawgApiKey)
                .retrieve()
                .body(String.class);
    }

    public String getGameDetails(String id) {
        log.info("Calling RAWG API: game details for id={}", id);
        return restClient.get()
                .uri(baseUrl + "/games/{id}?key={key}", id, rawgApiKey)
                .retrieve()
                .body(String.class);
    }

    public String getGameAchievements(String id) {
        log.info("Calling RAWG API: all game achievements for id={}", id);
        try {
            int page = 1;
            int pageSize = 40;
            List<String> accumulatedElements = new ArrayList<>();
            int totalCount = 0;
            Pattern countPattern = Pattern.compile("\"count\"\\s*:\\s*(\\d+)");
            Pattern nextPattern = Pattern.compile("\"next\"\\s*:\\s*(null|\"[^\"]*\")");

            while (true) {
                String responseBody = restClient.get()
                        .uri(baseUrl + "/games/{id}/achievements?key={key}&page_size={pageSize}&page={page}",
                                id, rawgApiKey, pageSize, page)
                        .retrieve()
                        .body(String.class);

                if (responseBody == null || responseBody.isBlank()) {
                    break;
                }

                if (totalCount == 0) {
                    Matcher m = countPattern.matcher(responseBody);
                    if (m.find()) {
                        totalCount = Integer.parseInt(m.group(1));
                    }
                }

                // Extract contents of \"results\": [...]
                int resultsIdx = responseBody.indexOf("\"results\"");
                if (resultsIdx != -1) {
                    int startBracket = responseBody.indexOf("[", resultsIdx);
                    int endBracket = responseBody.lastIndexOf("]");
                    if (startBracket != -1 && endBracket > startBracket) {
                        String innerResults = responseBody.substring(startBracket + 1, endBracket).trim();
                        if (!innerResults.isEmpty()) {
                            accumulatedElements.add(innerResults);
                        }
                    }
                }

                // Check if \"next\" is null
                Matcher nextMatcher = nextPattern.matcher(responseBody);
                boolean hasNext = nextMatcher.find() && !"null".equals(nextMatcher.group(1));
                if (!hasNext) {
                    break;
                }

                page++;
                if (page > 15) { // Safety guard
                    break;
                }
            }

            if (accumulatedElements.isEmpty()) {
                return "{\"count\":0,\"results\":[]}";
            }

            String mergedResults = String.join(",", accumulatedElements);
            int count = (totalCount > 0) ? totalCount : accumulatedElements.size();
            return "{\"count\":" + count + ",\"results\":[" + mergedResults + "]}";
        } catch (Exception ex) {
            log.error("Failed to fetch all achievements for id={}: {}", id, ex.getMessage(), ex);
            return restClient.get()
                    .uri(baseUrl + "/games/{id}/achievements?key={key}&page_size=40", id, rawgApiKey)
                    .retrieve()
                    .body(String.class);
        }
    }
}
