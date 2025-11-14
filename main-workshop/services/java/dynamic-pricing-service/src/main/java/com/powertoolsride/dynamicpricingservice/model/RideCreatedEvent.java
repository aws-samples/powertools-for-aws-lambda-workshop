package com.powertoolsride.dynamicpricingservice.model;

import com.fasterxml.jackson.annotation.JsonProperty;

public record RideCreatedEvent(
    @JsonProperty("rideId") String rideId,
    @JsonProperty("riderId") String riderId,
    @JsonProperty("riderName") String riderName,
    @JsonProperty("pickupLocation") Location pickupLocation,
    @JsonProperty("destinationLocation") Location destinationLocation,
    @JsonProperty("paymentMethod") String paymentMethod,
    @JsonProperty("timestamp") String timestamp,
    @JsonProperty("eventType") String eventType,
    @JsonProperty("correlationId") String correlationId
) {}
