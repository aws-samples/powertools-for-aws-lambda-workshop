package com.powertoolsride.dynamicpricingservice.model;

import java.math.BigDecimal;
import com.fasterxml.jackson.annotation.JsonProperty;

public record PricingResult(
    @JsonProperty("rideId") String rideId,
    @JsonProperty("riderId") String riderId,
    @JsonProperty("finalPrice") BigDecimal finalPrice,
    @JsonProperty("basePrice") BigDecimal basePrice,
    @JsonProperty("surgeMultiplier") BigDecimal surgeMultiplier,
    @JsonProperty("success") boolean success,
    @JsonProperty("errorMessage") String errorMessage
) {
}
