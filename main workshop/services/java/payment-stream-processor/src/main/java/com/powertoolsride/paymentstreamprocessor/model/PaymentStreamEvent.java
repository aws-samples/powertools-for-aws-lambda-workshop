package com.powertoolsride.paymentstreamprocessor.model;

import com.fasterxml.jackson.annotation.JsonProperty;

public record PaymentStreamEvent(
    @JsonProperty("success") boolean success,
    @JsonProperty("paymentId") String paymentId,
    @JsonProperty("rideId") String rideId,
    @JsonProperty("riderId") String riderId,
    @JsonProperty("driverId") String driverId,
    @JsonProperty("correlationId") String correlationId,
    @JsonProperty("amount") String amount,
    @JsonProperty("paymentMethod") String paymentMethod,
    @JsonProperty("transactionId") String transactionId,
    @JsonProperty("status") String status
) {}
