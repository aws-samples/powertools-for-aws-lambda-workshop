package com.powertoolsride.paymentprocessor.model;

import com.fasterxml.jackson.annotation.JsonProperty;

public record PaymentGatewayResult(
    @JsonProperty("success") boolean success,
    @JsonProperty("transactionId") String transactionId,
    @JsonProperty("errorMessage") String errorMessage,
    @JsonProperty("processingTimeMs") long processingTimeMs
) {}
