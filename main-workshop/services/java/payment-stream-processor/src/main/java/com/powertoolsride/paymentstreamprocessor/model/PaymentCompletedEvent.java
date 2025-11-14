package com.powertoolsride.paymentstreamprocessor.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;
import java.time.Instant;

public record PaymentCompletedEvent(
    @JsonProperty("eventType") String eventType,
    @JsonProperty("paymentId") String paymentId,
    @JsonProperty("rideId") String rideId,
    @JsonProperty("riderId") String riderId,
    @JsonProperty("driverId") String driverId,
    @JsonProperty("amount") BigDecimal amount,
    @JsonProperty("paymentMethod") String paymentMethod,
    @JsonProperty("transactionId") String transactionId,
    @JsonProperty("timestamp") String timestamp,
    @JsonProperty("correlationId") String correlationId
) {}
