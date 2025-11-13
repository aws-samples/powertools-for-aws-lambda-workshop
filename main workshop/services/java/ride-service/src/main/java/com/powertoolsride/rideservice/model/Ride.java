package com.powertoolsride.rideservice.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;

public record Ride(
    @JsonProperty("rideId") String rideId,
    @JsonProperty("riderId") String riderId,
    @JsonProperty("riderName") String riderName,
    @JsonProperty("pickupLocation") Location pickupLocation,
    @JsonProperty("destinationLocation") Location destinationLocation,
    @JsonProperty("status") String status,
    @JsonProperty("paymentMethod") String paymentMethod,
    @JsonProperty("deviceId") String deviceId,
    @JsonProperty("createdAt") String createdAt,
    @JsonProperty("updatedAt") String updatedAt,
    @JsonProperty("driverId") String driverId,
    @JsonProperty("driverName") String driverName,
    @JsonProperty("finalPrice") BigDecimal finalPrice
) {}
