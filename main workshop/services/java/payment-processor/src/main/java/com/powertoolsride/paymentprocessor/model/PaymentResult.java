package com.powertoolsride.paymentprocessor.model;

import com.fasterxml.jackson.annotation.JsonProperty;

public record PaymentResult(
    @JsonProperty("success") boolean success,
    @JsonProperty("payment") Payment payment,
    @JsonProperty("transactionId") String transactionId,
    @JsonProperty("errorMessage") String errorMessage,
    @JsonProperty("processingTimeMs") long processingTimeMs
) {}
