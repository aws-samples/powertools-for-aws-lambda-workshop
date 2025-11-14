package com.powertoolsride.paymentprocessor.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;

public record DriverAssignedEvent(
    @JsonProperty("eventType") String eventType,
    @JsonProperty("rideId") String rideId,
    @JsonProperty("riderId") String riderId,
    @JsonProperty("riderName") String riderName,
    @JsonProperty("driverId") String driverId,
    @JsonProperty("driverName") String driverName,
    @JsonProperty("estimatedPrice") BigDecimal estimatedPrice,
    @JsonProperty("basePrice") BigDecimal basePrice,
    @JsonProperty("surgeMultiplier") BigDecimal surgeMultiplier,
    @JsonProperty("pickupLocation") Location pickupLocation,
    @JsonProperty("dropoffLocation") Location dropoffLocation,
    @JsonProperty("estimatedArrivalMinutes") int estimatedArrivalMinutes,
    @JsonProperty("distanceKm") double distanceKm,
    @JsonProperty("paymentMethod") String paymentMethod,
    @JsonProperty("timestamp") String timestamp,
    @JsonProperty("correlationId") String correlationId
) {}
