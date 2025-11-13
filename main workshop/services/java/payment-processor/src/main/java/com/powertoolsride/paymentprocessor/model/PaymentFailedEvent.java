package com.powertoolsride.paymentprocessor.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;

public record PaymentFailedEvent(
    @JsonProperty("eventType") String eventType,
    @JsonProperty("paymentId") String paymentId,
    @JsonProperty("rideId") String rideId,
    @JsonProperty("riderId") String riderId,
    @JsonProperty("driverId") String driverId,
    @JsonProperty("amount") BigDecimal amount,
    @JsonProperty("paymentMethod") String paymentMethod,
    @JsonProperty("failureReason") String failureReason,
    @JsonProperty("timestamp") String timestamp,
    @JsonProperty("correlationId") String correlationId
) {}
