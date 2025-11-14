package com.powertoolsride.rideservice.model;

import com.fasterxml.jackson.annotation.JsonProperty;

public record CreateRideRequest(
    @JsonProperty("riderId") String riderId,
    @JsonProperty("riderName") String riderName,
    @JsonProperty("pickupLocation") Location pickupLocation,
    @JsonProperty("destinationLocation") Location destinationLocation,
    @JsonProperty("paymentMethod") String paymentMethod
) {}
