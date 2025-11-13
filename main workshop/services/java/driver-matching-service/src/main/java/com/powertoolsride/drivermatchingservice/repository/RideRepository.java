package com.powertoolsride.drivermatchingservice.repository;

import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;
import software.amazon.awssdk.services.dynamodb.model.UpdateItemRequest;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

public class RideRepository {
    private final DynamoDbClient dynamoDb;
    private final String tableName;

    public RideRepository() {
        this.dynamoDb = DynamoDbClient.builder()
            .overrideConfiguration(software.amazon.awssdk.core.client.config.ClientOverrideConfiguration.builder()
                .addExecutionInterceptor(new com.amazonaws.xray.interceptors.TracingInterceptor())
                .build())
            .build();
        String tableName = System.getenv("RIDES_TABLE_NAME");
        this.tableName = (tableName != null && !tableName.isEmpty()) ? tableName : "powertools-ride-workshop-Rides";
    }

    public void updateRideWithDriver(String rideId, String driverId, String status) {
        Map<String, AttributeValue> key = new HashMap<>();
        key.put("rideId", AttributeValue.builder().s(rideId).build());

        Map<String, String> expressionAttributeNames = new HashMap<>();
        expressionAttributeNames.put("#status", "status");

        Map<String, AttributeValue> expressionAttributeValues = new HashMap<>();
        expressionAttributeValues.put(":driverId", AttributeValue.builder().s(driverId).build());
        expressionAttributeValues.put(":status", AttributeValue.builder().s(status).build());
        expressionAttributeValues.put(":updatedAt", AttributeValue.builder().s(Instant.now().toString()).build());

        UpdateItemRequest updateRequest = UpdateItemRequest.builder()
            .tableName(tableName)
            .key(key)
            .updateExpression("SET driverId = :driverId, #status = :status, updatedAt = :updatedAt")
            .expressionAttributeNames(expressionAttributeNames)
            .expressionAttributeValues(expressionAttributeValues)
            .build();

        dynamoDb.updateItem(updateRequest);
    }
}
