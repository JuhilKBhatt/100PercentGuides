package com.example.demo.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class GameChecklistService {

    private static final Logger log = LoggerFactory.getLogger(GameChecklistService.class);

    private final RawgClientService rawgClientService;

    public GameChecklistService(RawgClientService rawgClientService) {
        this.rawgClientService = rawgClientService;
    }

    public String getGameChecklist(String id) {
        log.info("Generating dynamic achievement-derived checklist for game id={}", id);
        try {
            String achievementsJson = rawgClientService.getGameAchievements(id);
            return generateDynamicChecklist(id, achievementsJson);
        } catch (Exception ex) {
            log.error("Failed to generate dynamic checklist for id={}: {}", id, ex.getMessage(), ex);
            return "{\"gameId\":\"" + id + "\",\"gameName\":\"Game\",\"totalRequirements\":0,\"categories\":[]}";
        }
    }

    private String generateDynamicChecklist(String id, String achievementsJson) {
        Pattern itemPattern = Pattern.compile("\"id\"\\s*:\\s*(\\d+)[^}]*?\"name\"\\s*:\\s*\"([^\"]+)\"");
        Matcher matcher = itemPattern.matcher(achievementsJson);

        StringBuilder storyItems = new StringBuilder();
        StringBuilder masteryItems = new StringBuilder();
        int countStory = 0;
        int countMastery = 0;

        while (matcher.find()) {
            String achId = matcher.group(1);
            String achName = escapeJson(matcher.group(2));

            String itemJson = "{\"id\":\"ach_" + achId + "\",\"title\":\"" + achName + "\",\"totalRequired\":1,\"category\":\"general\"}";

            if ((countStory + countMastery) % 2 == 0) {
                if (countStory > 0) storyItems.append(",");
                storyItems.append(itemJson);
                countStory++;
            } else {
                if (countMastery > 0) masteryItems.append(",");
                masteryItems.append(itemJson);
                countMastery++;
            }
        }

        int total = countStory + countMastery;
        return "{" +
                "\"gameId\":\"" + id + "\"," +
                "\"gameName\":\"Game\"," +
                "\"totalRequirements\":" + total + "," +
                "\"categories\":[" +
                "{\"id\":\"milestones\",\"name\":\"Key Milestones\",\"totalItems\":" + countStory + ",\"items\":[" + storyItems + "]}," +
                "{\"id\":\"mastery\",\"name\":\"Mastery & Completion\",\"totalItems\":" + countMastery + ",\"items\":[" + masteryItems + "]}" +
                "]" +
                "}";
    }

    private String escapeJson(String s) {
        return s.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
