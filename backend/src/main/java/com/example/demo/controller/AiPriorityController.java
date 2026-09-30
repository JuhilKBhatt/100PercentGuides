package com.example.demo.controller;

import com.example.demo.service.GuideService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/ai")
public class AiPriorityController {

    private final GuideService guideService;

    public AiPriorityController(GuideService guideService) {
        this.guideService = guideService;
    }

    @PostMapping("/priority")
    public ResponseEntity<Map<String, Object>> signalPriority() {
        guideService.signalUserPriority();
        return ResponseEntity.ok(Map.of("userActive", true, "message", "User priority signaled"));
    }

    @GetMapping("/priority")
    public ResponseEntity<Map<String, Object>> checkPriority() {
        boolean active = guideService.isUserPriorityActive();
        return ResponseEntity.ok(Map.of("userActive", active));
    }
}
