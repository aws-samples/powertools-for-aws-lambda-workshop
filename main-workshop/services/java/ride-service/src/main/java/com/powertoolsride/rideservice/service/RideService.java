package com.powertoolsride.rideservice.service;

import com.powertoolsride.rideservice.model.CreateRideRequest;
import com.powertoolsride.rideservice.model.Ride;
import com.powertoolsride.rideservice.model.RideCreatedEvent;
import com.powertoolsride.rideservice.model.RideCreationResult;
import com.powertoolsride.rideservice.repository.RideRepository;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyRequestEvent;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.eventbridge.EventBridgeClient;
import software.amazon.awssdk.services.eventbridge.model.PutEventsRequest;
import software.amazon.awssdk.services.eventbridge.model.PutEventsRequestEntry;
import software.amazon.awssdk.services.eventbridge.model.PutEventsResponse;


import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public class RideService {
    private final RideRepository rideRepository;
    private final EventBridgeClient eventBridgeClient;
    private final String eventBusName;
    private final ObjectMapper objectMapper;

    public RideService() {
        String tableName = System.getenv("RIDES_TABLE_NAME");
        if (tableName == null) {
            tableName = "Rides";
        }
        
        String eventBusName = System.getenv("EVENT_BUS_NAME");
        if (eventBusName == null) {
            eventBusName = "";
        }
        
        DynamoDbClient dynamoDbClient = DynamoDbClient
                .builder()
                .overrideConfiguration(software.amazon.awssdk.core.client.config.ClientOverrideConfiguration.builder()
                    .addExecutionInterceptor(new com.amazonaws.xray.interceptors.TracingInterceptor())
                    .build())
                .build();
        this.eventBridgeClient = EventBridgeClient.builder()
                .overrideConfiguration(software.amazon.awssdk.core.client.config.ClientOverrideConfiguration.builder()
                        .addExecutionInterceptor(new com.amazonaws.xray.interceptors.TracingInterceptor())
                        .build())
                .build();
        this.rideRepository = new RideRepository(dynamoDbClient, tableName);
        this.eventBusName = eventBusName;
        this.objectMapper = new ObjectMapper();
        this.objectMapper.registerModule(new JavaTimeModule());
    }

    public RideCreationResult createRideAsync(APIGatewayProxyRequestEvent request, String deviceId) {
        RideCreationResult result = new RideCreationResult();

        // Extract correlation ID from request headers
        String correlationId = getHeaderValue(request.getHeaders(), "x-correlation-id");
        if (correlationId == null || correlationId.isEmpty()) {
            correlationId = null;
        }

        // Deserialize request
        CreateRideRequest createRequest;
        try {
            createRequest = objectMapper.readValue(request.getBody(), CreateRideRequest.class);
        } catch (JsonProcessingException e) {
            result.setSuccess(false);
            result.setErrorType("JsonException");
            result.setErrorMessage("Invalid JSON format");
            return result;
        }

        if (createRequest == null) {
            result.setSuccess(false);
            result.setErrorType("InvalidRequest");
            result.setErrorMessage("Invalid request format");
            return result;
        }

        // Create ride object
        Ride ride = new Ride(
            UUID.randomUUID().toString(),
            createRequest.riderId(),
            createRequest.riderName(),
            createRequest.pickupLocation(),
            createRequest.destinationLocation(),
            "requested",
            createRequest.paymentMethod(),
            deviceId,
            Instant.now().toString(),
            Instant.now().toString(),
            null,
            null,
            null
        );

        // Save to DynamoDB
        rideRepository.save(ride);

        // Send event to EventBridge with correlation ID
        sendRideCreatedEvent(ride, correlationId);

        result.setSuccess(true);
        result.setRide(ride);
        return result;
    }

    private void sendRideCreatedEvent(Ride ride, String correlationId) {
        if (eventBusName == null || eventBusName.isEmpty()) {
            return;
        }

        RideCreatedEvent event = new RideCreatedEvent(
            ride.rideId(),
            ride.riderId(),
            ride.riderName(),
            ride.pickupLocation(),
            ride.destinationLocation(),
            ride.paymentMethod(),
            Instant.now(),
            "RideCreated",
            correlationId
        );

        String eventDetailJson;
        try {
            eventDetailJson = objectMapper.writeValueAsString(event);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Failed to serialize event", e);
        }

        PutEventsRequestEntry entry = PutEventsRequestEntry.builder()
            .source("ride-service")
            .detailType("RideCreated")
            .detail(eventDetailJson)
            .eventBusName(eventBusName)
            .build();

        PutEventsRequest putEventsRequest = PutEventsRequest.builder()
            .entries(entry)
            .build();

        PutEventsResponse response = eventBridgeClient.putEvents(putEventsRequest);

        if (response.failedEntryCount() > 0) {
            throw new RuntimeException("Failed to send event: " + response.entries().get(0).errorCode());
        }
    }

    public String getHeaderValue(Map<String, String> headers, String headerName) {
        if (headers == null) {
            return null;
        }

        for (Map.Entry<String, String> entry : headers.entrySet()) {
            if (entry.getKey() != null && entry.getKey().equalsIgnoreCase(headerName)) {
                return entry.getValue();
            }
        }

        return null;
    }
}
