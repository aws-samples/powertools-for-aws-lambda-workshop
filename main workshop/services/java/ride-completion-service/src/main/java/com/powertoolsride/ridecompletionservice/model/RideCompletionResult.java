package com.powertoolsride.ridecompletionservice.model;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.math.BigDecimal;

/**
 * Result of processing a payment completion event
 */
public record RideCompletionResult(
    @JsonProperty("paymentId") String paymentId,
    @JsonProperty("rideId") String rideId,
    @JsonProperty("riderId") String riderId,
    @JsonProperty("driverId") String driverId,
    @JsonProperty("paymentMethod") String paymentMethod,
    @JsonProperty("amount") BigDecimal amount,
    @JsonProperty("rideUpdateSuccessful") boolean rideUpdateSuccessful,
    @JsonProperty("driverUpdateSuccessful") boolean driverUpdateSuccessful,
    @JsonProperty("success") boolean success,
    @JsonProperty("errorType") String errorType,
    @JsonProperty("errorMessage") String errorMessage
) {
    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private String paymentId;
        private String rideId;
        private String riderId;
        private String driverId;
        private String paymentMethod;
        private BigDecimal amount;
        private boolean rideUpdateSuccessful;
        private boolean driverUpdateSuccessful;
        private boolean success;
        private String errorType;
        private String errorMessage;

        public Builder paymentId(String paymentId) {
            this.paymentId = paymentId;
            return this;
        }

        public Builder rideId(String rideId) {
            this.rideId = rideId;
            return this;
        }

        public Builder riderId(String riderId) {
            this.riderId = riderId;
            return this;
        }

        public Builder driverId(String driverId) {
            this.driverId = driverId;
            return this;
        }

        public Builder paymentMethod(String paymentMethod) {
            this.paymentMethod = paymentMethod;
            return this;
        }

        public Builder amount(BigDecimal amount) {
            this.amount = amount;
            return this;
        }

        public Builder rideUpdateSuccessful(boolean rideUpdateSuccessful) {
            this.rideUpdateSuccessful = rideUpdateSuccessful;
            return this;
        }

        public Builder driverUpdateSuccessful(boolean driverUpdateSuccessful) {
            this.driverUpdateSuccessful = driverUpdateSuccessful;
            return this;
        }

        public Builder success(boolean success) {
            this.success = success;
            return this;
        }

        public Builder errorType(String errorType) {
            this.errorType = errorType;
            return this;
        }

        public Builder errorMessage(String errorMessage) {
            this.errorMessage = errorMessage;
            return this;
        }

        public RideCompletionResult build() {
            return new RideCompletionResult(
                paymentId,
                rideId,
                riderId,
                driverId,
                paymentMethod,
                amount,
                rideUpdateSuccessful,
                driverUpdateSuccessful,
                success,
                errorType,
                errorMessage
            );
        }
    }
}
