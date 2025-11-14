package com.powertoolsride.drivermatchingservice.model;

import com.fasterxml.jackson.annotation.JsonProperty;

public record DriverMatch(
    @JsonProperty("rideId") String rideId,
    @JsonProperty("driverId") String driverId,
    @JsonProperty("driverName") String driverName,
    @JsonProperty("estimatedArrivalTime") int estimatedArrivalMinutes,
    @JsonProperty("distance") double distanceKm,
    @JsonProperty("createdAt") String createdAt
) {}
