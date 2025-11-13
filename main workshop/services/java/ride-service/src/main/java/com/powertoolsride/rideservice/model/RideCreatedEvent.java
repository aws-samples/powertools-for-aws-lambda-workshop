package com.powertoolsride.rideservice.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.Instant;

public record RideCreatedEvent(
    @JsonProperty("rideId") String rideId,
    @JsonProperty("riderId") String riderId,
    @JsonProperty("riderName") String riderName,
    @JsonProperty("pickupLocation") Location pickupLocation,
    @JsonProperty("destinationLocation") Location destinationLocation,
    @JsonProperty("paymentMethod") String paymentMethod,
    @JsonProperty("timestamp") Instant timestamp,
    @JsonProperty("eventType") String eventType,
    @JsonProperty("correlationId") String correlationId
) {}
