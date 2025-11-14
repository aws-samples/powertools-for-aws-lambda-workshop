package com.powertoolsride.ridecompletionservice.repository;

import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.*;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

public class DriverRepository {
    private final DynamoDbClient dynamoDb;
    private final String tableName;

    public DriverRepository(DynamoDbClient dynamoDb, String tableName) {
        this.dynamoDb = dynamoDb;
        this.tableName = tableName;
    }

    public void updateDriverStatus(String driverId, String status) {
        if (driverId == null || driverId.isEmpty()) {
            throw new IllegalArgumentException("DriverId cannot be null or empty");
        }

        if (status == null || status.isEmpty()) {
            throw new IllegalArgumentException("Status cannot be null or empty");
        }

        Map<String, AttributeValue> key = new HashMap<>();
        key.put("driverId", AttributeValue.builder().s(driverId).build());

        Map<String, String> expressionAttributeNames = new HashMap<>();
        expressionAttributeNames.put("#status", "status");
        expressionAttributeNames.put("#updatedAt", "updatedAt");

        Map<String, AttributeValue> expressionAttributeValues = new HashMap<>();
        expressionAttributeValues.put(":status", AttributeValue.builder().s(status).build());
        expressionAttributeValues.put(":updatedAt", AttributeValue.builder().s(Instant.now().toString()).build());

        try {
            UpdateItemRequest request = UpdateItemRequest.builder()
                .tableName(tableName)
                .key(key)
                .updateExpression("SET #status = :status, #updatedAt = :updatedAt")
                .expressionAttributeNames(expressionAttributeNames)
                .expressionAttributeValues(expressionAttributeValues)
                .conditionExpression("attribute_exists(driverId)")
                .returnValues(ReturnValue.UPDATED_NEW)
                .build();

            dynamoDb.updateItem(request);
        } catch (ConditionalCheckFailedException e) {
            throw new RuntimeException("Driver with ID " + driverId + " not found", e);
        } catch (DynamoDbException e) {
            throw new RuntimeException("Failed to update driver status for driver " + driverId + ": " + e.getMessage(), e);
        }
    }
}
