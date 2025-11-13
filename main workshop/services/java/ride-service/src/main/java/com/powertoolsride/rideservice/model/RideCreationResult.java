package com.powertoolsride.rideservice.model;

public class RideCreationResult {
    private Ride ride;
    private boolean success;
    private String errorMessage;
    private String errorType;

    public RideCreationResult() {
        this.success = false;
        this.errorMessage = "";
        this.errorType = "";
    }

    public Ride getRide() {
        return ride;
    }

    public void setRide(Ride ride) {
        this.ride = ride;
    }

    public boolean isSuccess() {
        return success;
    }

    public void setSuccess(boolean success) {
        this.success = success;
    }

    public String getErrorMessage() {
        return errorMessage;
    }

    public void setErrorMessage(String errorMessage) {
        this.errorMessage = errorMessage;
    }

    public String getErrorType() {
        return errorType;
    }

    public void setErrorType(String errorType) {
        this.errorType = errorType;
    }
}
