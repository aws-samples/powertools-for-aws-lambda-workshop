package com.powertoolsride.ridecompletionservice.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.math.BigDecimal;

/**
 * Represents a payment completion event received from EventBridge
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record PaymentCompletedEvent(
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
