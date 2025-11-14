package com.powertoolsride.paymentprocessor.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;

public record Payment(
    @JsonProperty("paymentId") String paymentId,
    @JsonProperty("rideId") String rideId,
    @JsonProperty("riderId") String riderId,
    @JsonProperty("driverId") String driverId,
    @JsonProperty("amount") BigDecimal amount,
    @JsonProperty("paymentMethod") String paymentMethod,
    @JsonProperty("status") String status,
    @JsonProperty("failureReason") String failureReason,
    @JsonProperty("transactionId") String transactionId,
    @JsonProperty("createdAt") String createdAt,
    @JsonProperty("updatedAt") String updatedAt
) {}
