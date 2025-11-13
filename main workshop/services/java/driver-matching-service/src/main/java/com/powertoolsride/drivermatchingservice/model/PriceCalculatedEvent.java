package com.powertoolsride.drivermatchingservice.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;

public record PriceCalculatedEvent(
    @JsonProperty("rideId") String rideId,
    @JsonProperty("riderId") String riderId,
    @JsonProperty("riderName") String riderName,
    @JsonProperty("pickupLocation") Location pickupLocation,
    @JsonProperty("dropoffLocation") Location dropoffLocation,
    @JsonProperty("estimatedPrice") BigDecimal estimatedPrice,
    @JsonProperty("basePrice") BigDecimal basePrice,
    @JsonProperty("surgeMultiplier") BigDecimal surgeMultiplier,
    @JsonProperty("paymentMethod") String paymentMethod,
    @JsonProperty("timestamp") String timestamp,
    @JsonProperty("correlationId") String correlationId
) {}
