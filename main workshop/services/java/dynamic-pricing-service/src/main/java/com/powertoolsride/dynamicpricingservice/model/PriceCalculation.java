package com.powertoolsride.dynamicpricingservice.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;

public record PriceCalculation(
    @JsonProperty("basePrice") BigDecimal basePrice,
    @JsonProperty("finalPrice") BigDecimal finalPrice,
    @JsonProperty("surgeMultiplier") BigDecimal surgeMultiplier,
    @JsonProperty("createdAt") String createdAt
) {}
