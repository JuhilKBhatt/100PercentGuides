package com.example.demo.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.time.LocalDate;

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
        log.info("Calling RAWG API: search games for query='{}'", query);
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
        log.info("Calling RAWG API: game achievements for id={}", id);
        return restClient.get()
                .uri(baseUrl + "/games/{id}/achievements?key={key}", id, rawgApiKey)
                .retrieve()
                .body(String.class);
    }
}
