package com.example.demo;

import com.example.demo.controller.AiPriorityController;
import com.example.demo.service.GuideService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.http.ResponseEntity;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;
import software.amazon.awssdk.services.dynamodb.model.QueryRequest;
import software.amazon.awssdk.services.dynamodb.model.QueryResponse;

import java.time.Duration;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class GuideServiceTest {

    @Test
    @DisplayName("User Priority: signalUserPriority sets key in Redis, isUserPriorityActive checks it")
    void testUserPriorityCoordinator() {
        DynamoDbClient mockDynamo = mock(DynamoDbClient.class);
        StringRedisTemplate mockRedis = mock(StringRedisTemplate.class);
        ValueOperations<String, String> mockOps = mock(ValueOperations.class);
        when(mockRedis.opsForValue()).thenReturn(mockOps);

        GuideService guideService = new GuideService(mockDynamo, mockRedis);
        AiPriorityController controller = new AiPriorityController(guideService);

        // Test signaling priority
        ResponseEntity<?> postRes = controller.signalPriority();
        assertEquals(200, postRes.getStatusCode().value());
        verify(mockOps).set(eq("user_active_priority"), eq("1"), any(Duration.class));

        // Test checking priority when active
        when(mockOps.get("user_active_priority")).thenReturn("1");
        ResponseEntity<Map<String, Object>> getRes = controller.checkPriority();
        assertEquals(200, getRes.getStatusCode().value());
        assertTrue((Boolean) getRes.getBody().get("userActive"));

        // Test checking priority when inactive
        when(mockOps.get("user_active_priority")).thenReturn(null);
        getRes = controller.checkPriority();
        assertFalse((Boolean) getRes.getBody().get("userActive"));
    }

    @Test
    @DisplayName("DynamoDB Pagination: listGuidesForGame paginates across multiple pages to return 100% of guides")
    void testListGuidesForGamePagination() {
        DynamoDbClient mockDynamo = mock(DynamoDbClient.class);
        StringRedisTemplate mockRedis = mock(StringRedisTemplate.class);

        // Page 1 Item
        Map<String, AttributeValue> item1 = new HashMap<>();
        item1.put("gameId", AttributeValue.builder().s("3498").build());
        item1.put("guideSlug", AttributeValue.builder().s("ach-101").build());
        item1.put("title", AttributeValue.builder().s("First Achievement Checklist").build());
        item1.put("totalCount", AttributeValue.builder().n("5").build());
        item1.put("achievementId", AttributeValue.builder().s("101").build());

        Map<String, AttributeValue> lastKey = Map.of("guideSlug", AttributeValue.builder().s("ach-101").build());

        QueryResponse page1 = QueryResponse.builder()
                .items(List.of(item1))
                .lastEvaluatedKey(lastKey)
                .build();

        // Page 2 Item
        Map<String, AttributeValue> item2 = new HashMap<>();
        item2.put("gameId", AttributeValue.builder().s("3498").build());
        item2.put("guideSlug", AttributeValue.builder().s("ach-102").build());
        item2.put("title", AttributeValue.builder().s("Second Achievement Checklist").build());
        item2.put("totalCount", AttributeValue.builder().n("8").build());
        item2.put("achievementId", AttributeValue.builder().s("102").build());

        QueryResponse page2 = QueryResponse.builder()
                .items(List.of(item2))
                .lastEvaluatedKey(null) // end of pages
                .build();

        when(mockDynamo.query(any(QueryRequest.class)))
                .thenReturn(page1)
                .thenReturn(page2);

        GuideService guideService = new GuideService(mockDynamo, mockRedis);
        List<Map<String, Object>> result = guideService.listGuidesForGame("3498");

        // Verify both pages were fetched!
        assertEquals(2, result.size());
        assertEquals("ach-101", result.get(0).get("guideSlug"));
        assertEquals("ach-102", result.get(1).get("guideSlug"));
        verify(mockDynamo, times(2)).query(any(QueryRequest.class));
    }
}
