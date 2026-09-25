package com.example.demo.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.DynamoDbClientBuilder;
import software.amazon.awssdk.services.dynamodb.model.*;

import java.net.URI;

@Configuration
public class DynamoDbConfig {

    private static final Logger log = LoggerFactory.getLogger(DynamoDbConfig.class);
    public static final String TABLE_NAME = "GameCache";

    @Value("${aws.region:us-east-1}")
    private String region;

    @Value("${aws.accessKeyId:test}")
    private String accessKeyId;

    @Value("${aws.secretAccessKey:test}")
    private String secretAccessKey;

    @Value("${aws.dynamodb.endpoint:}")
    private String endpoint;

    @Bean
    public DynamoDbClient dynamoDbClient() {
        String effectiveKey = accessKeyId;
        String effectiveSecret = secretAccessKey;
        if (endpoint != null && !endpoint.isBlank()) {
            // Local DynamoDB requires standard alphanumeric credentials
            if (effectiveKey == null || effectiveKey.contains("_") || effectiveKey.isBlank() || effectiveKey.startsWith("your_")) {
                effectiveKey = "DUMMYKEYEXAMPLE12345";
                effectiveSecret = "DUMMYSECRETKEYEXAMPLE123456789012345";
            }
        }

        DynamoDbClientBuilder builder = DynamoDbClient.builder()
                .region(Region.of(region))
                .credentialsProvider(StaticCredentialsProvider.create(
                        AwsBasicCredentials.create(effectiveKey, effectiveSecret)));

        if (endpoint != null && !endpoint.isBlank()) {
            builder.endpointOverride(URI.create(endpoint));
        }

        DynamoDbClient client = builder.build();
        initTable(client);
        return client;
    }

    private void initTable(DynamoDbClient client) {
        try {
            client.describeTable(DescribeTableRequest.builder().tableName(TABLE_NAME).build());
            log.info("DynamoDB table {} already exists.", TABLE_NAME);
        } catch (ResourceNotFoundException e) {
            log.info("Creating DynamoDB table {}...", TABLE_NAME);
            try {
                client.createTable(CreateTableRequest.builder()
                        .tableName(TABLE_NAME)
                        .keySchema(KeySchemaElement.builder()
                                .attributeName("cacheKey")
                                .keyType(KeyType.HASH)
                                .build())
                        .attributeDefinitions(AttributeDefinition.builder()
                                .attributeName("cacheKey")
                                .attributeType(ScalarAttributeType.S)
                                .build())
                        .billingMode(BillingMode.PAY_PER_REQUEST)
                        .build());
                log.info("Created DynamoDB table {}", TABLE_NAME);
            } catch (Exception ex) {
                log.error("Failed to create DynamoDB table: {}", ex.getMessage());
            }
        } catch (Exception ex) {
            log.warn("Could not check DynamoDB table: {}", ex.getMessage());
        }
    }
}
