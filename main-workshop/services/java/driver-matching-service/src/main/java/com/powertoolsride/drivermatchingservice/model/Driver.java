package com.powertoolsride.drivermatchingservice.model;

import com.fasterxml.jackson.annotation.JsonProperty;

public record Driver(
    @JsonProperty("driverId") String driverId,
    @JsonProperty("driverName") String driverName,
    @JsonProperty("currentLocation") Location currentLocation,
    @JsonProperty("status") String status,
    @JsonProperty("rating") double rating,
    @JsonProperty("createdAt") String createdAt,
    @JsonProperty("updatedAt") String updatedAt
) {}
