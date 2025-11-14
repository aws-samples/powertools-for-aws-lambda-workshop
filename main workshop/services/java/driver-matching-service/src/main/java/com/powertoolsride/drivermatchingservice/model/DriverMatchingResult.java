package com.powertoolsride.drivermatchingservice.model;

public class DriverMatchingResult {
    private String rideId;
    private String assignedDriverId;
    private int availableDriversCount;
    private boolean success;
    private String errorMessage;

    public DriverMatchingResult() {
    }

    public DriverMatchingResult(String rideId, String assignedDriverId, int availableDriversCount, 
                               boolean success, String errorMessage) {
        this.rideId = rideId;
        this.assignedDriverId = assignedDriverId;
        this.availableDriversCount = availableDriversCount;
        this.success = success;
        this.errorMessage = errorMessage;
    }

    public String getRideId() {
        return rideId;
    }

    public void setRideId(String rideId) {
        this.rideId = rideId;
    }

    public String getAssignedDriverId() {
        return assignedDriverId;
    }

    public void setAssignedDriverId(String assignedDriverId) {
        this.assignedDriverId = assignedDriverId;
    }

    public int getAvailableDriversCount() {
        return availableDriversCount;
    }

    public void setAvailableDriversCount(int availableDriversCount) {
        this.availableDriversCount = availableDriversCount;
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
}
