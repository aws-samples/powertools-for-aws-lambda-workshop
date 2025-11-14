package com.powertoolsride.drivermatchingservice.model;

import com.fasterxml.jackson.annotation.JsonProperty;

public record Location(
    @JsonProperty("address") String address,
    @JsonProperty("latitude") double latitude,
    @JsonProperty("longitude") double longitude
) {}
