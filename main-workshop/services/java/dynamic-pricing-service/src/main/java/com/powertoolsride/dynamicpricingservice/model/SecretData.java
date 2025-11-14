package com.powertoolsride.dynamicpricingservice.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;

public record SecretData(
    @JsonProperty("rushHourMultiplier") BigDecimal rushHourMultiplier,
    @JsonProperty("lastUpdated") String lastUpdated,
    @JsonProperty("description") String description
) {}
