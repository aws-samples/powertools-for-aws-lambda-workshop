package com.powertoolsride.drivermatchingservice.repository;

import com.powertoolsride.drivermatchingservice.model.Driver;
import com.powertoolsride.drivermatchingservice.model.Location;
import com.fasterxml.jackson.databind.ObjectMapper;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class DriverRepository {
    private final DynamoDbClient dynamoDb;
    private final String tableName;
    private final ObjectMapper objectMapper;

    public DriverRepository() {
        this.dynamoDb = DynamoDbClient.builder()
            .overrideConfiguration(software.amazon.awssdk.core.client.config.ClientOverrideConfiguration.builder()
                .addExecutionInterceptor(new com.amazonaws.xray.interceptors.TracingInterceptor())
                .build())
            .build();
        String tableName = System.getenv("DRIVERS_TABLE_NAME");
        this.tableName = (tableName != null && !tableName.isEmpty()) ? tableName : "Drivers";
        this.objectMapper = new ObjectMapper();
    }

    public List<Driver> getAvailableDrivers() {
        // For demo purposes: fetch all drivers without status filter
        ScanRequest scanRequest = ScanRequest.builder()
            .tableName(tableName)
            // .filterExpression("#status = :status")
            // .expressionAttributeNames(Map.of("#status", "status"))
            // .expressionAttributeValues(Map.of(":status", AttributeValue.builder().s("available").build()))
            .build();

        ScanResponse response = dynamoDb.scan(scanRequest);
        
        List<Driver> drivers = new ArrayList<>();
        for (Map<String, AttributeValue> item : response.items()) {
            try {
                Driver driver = deserializeDriver(item);
                drivers.add(driver);
            } catch (Exception e) {
                // ignored
            }
        }
        
        return drivers;
    }

    public void updateDriverStatus(String driverId, String status) {
        Map<String, AttributeValue> key = new HashMap<>();
        key.put("driverId", AttributeValue.builder().s(driverId).build());

        Map<String, String> expressionAttributeNames = new HashMap<>();
        expressionAttributeNames.put("#status", "status");

        Map<String, AttributeValue> expressionAttributeValues = new HashMap<>();
        expressionAttributeValues.put(":status", AttributeValue.builder().s(status).build());
        expressionAttributeValues.put(":updatedAt", AttributeValue.builder().s(Instant.now().toString()).build());

        UpdateItemRequest updateRequest = UpdateItemRequest.builder()
            .tableName(tableName)
            .key(key)
            .updateExpression("SET #status = :status, updatedAt = :updatedAt")
            .expressionAttributeNames(expressionAttributeNames)
            .expressionAttributeValues(expressionAttributeValues)
            .build();

        dynamoDb.updateItem(updateRequest);
    }

    public Driver deserializeDriver(Map<String, AttributeValue> item) {
        String driverId = item.get("driverId").s();
        String driverName = getDriverName(item);
        Location currentLocation = parseLocation(item);
        String status = item.get("status").s();
        double rating = item.containsKey("rating") ? Double.parseDouble(item.get("rating").n()) : 5.0;
        String createdAt = item.containsKey("createdAt") ? item.get("createdAt").s() : Instant.now().toString();
        String updatedAt = getUpdatedAt(item);

        return new Driver(driverId, driverName, currentLocation, status, rating, createdAt, updatedAt);
    }

    public Location parseLocation(Map<String, AttributeValue> item) {
        if (item.containsKey("currentLocation") && item.get("currentLocation").s() != null && !item.get("currentLocation").s().isEmpty()) {
            try {
                return objectMapper.readValue(item.get("currentLocation").s(), Location.class);
            } catch (Exception e) {
                return new Location("", 0.0, 0.0);
            }
        }
        
        if (item.containsKey("location") && item.get("location").s() != null && !item.get("location").s().isEmpty()) {
            try {
                return objectMapper.readValue(item.get("location").s(), Location.class);
            } catch (Exception e) {
                return new Location("", 0.0, 0.0);
            }
        }
        
        return new Location("", 0.0, 0.0);
    }

    public String getDriverName(Map<String, AttributeValue> item) {
        if (item.containsKey("driverName")) {
            return item.get("driverName").s();
        }
        if (item.containsKey("name")) {
            return item.get("name").s();
        }
        return "Unknown Driver";
    }

    public String getUpdatedAt(Map<String, AttributeValue> item) {
        if (item.containsKey("updatedAt")) {
            return item.get("updatedAt").s();
        }
        if (item.containsKey("lastUpdated")) {
            return item.get("lastUpdated").s();
        }
        return Instant.now().toString();
    }
}