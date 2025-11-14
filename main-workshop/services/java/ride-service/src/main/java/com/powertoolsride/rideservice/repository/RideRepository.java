package com.powertoolsride.rideservice.repository;

import com.powertoolsride.rideservice.model.Location;
import com.powertoolsride.rideservice.model.Ride;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;
import software.amazon.awssdk.services.dynamodb.model.PutItemRequest;

import java.util.HashMap;
import java.util.Map;

public class RideRepository {
    private final DynamoDbClient dynamoDbClient;
    private final String tableName;
    private final ObjectMapper objectMapper;

    public RideRepository(DynamoDbClient dynamoDbClient, String tableName) {
        this.dynamoDbClient = dynamoDbClient;
        this.tableName = tableName;
        this.objectMapper = new ObjectMapper();
    }

    public void save(Ride ride) {
        Map<String, AttributeValue> item = new HashMap<>();
        item.put("rideId", AttributeValue.builder().s(ride.rideId()).build());
        item.put("riderId", AttributeValue.builder().s(ride.riderId()).build());
        item.put("riderName", AttributeValue.builder().s(ride.riderName()).build());
        item.put("pickupLocation", AttributeValue.builder().s(serializeLocation(ride.pickupLocation())).build());
        item.put("destinationLocation", AttributeValue.builder().s(serializeLocation(ride.destinationLocation())).build());
        item.put("paymentMethod", AttributeValue.builder().s(ride.paymentMethod()).build());
        item.put("deviceId", AttributeValue.builder().s(ride.deviceId() != null ? ride.deviceId() : "unknown").build());
        item.put("status", AttributeValue.builder().s(ride.status()).build());
        item.put("createdAt", AttributeValue.builder().s(ride.createdAt()).build());
        item.put("updatedAt", AttributeValue.builder().s(ride.updatedAt()).build());

        PutItemRequest putItemRequest = PutItemRequest.builder()
            .tableName(tableName)
            .item(item)
            .build();

        dynamoDbClient.putItem(putItemRequest);
    }

    public String serializeLocation(Location location) {
        try {
            return objectMapper.writeValueAsString(location);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Failed to serialize location", e);
        }
    }
}
