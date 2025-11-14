package com.powertoolsride.drivermatchingservice;

import com.powertoolsride.drivermatchingservice.service.DriverMatchingService;
import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.amazonaws.services.lambda.runtime.events.ScheduledEvent;

public class Handler implements RequestHandler<ScheduledEvent, Void> {
    private final DriverMatchingService driverMatchingService;

    public Handler() {
        this.driverMatchingService = new DriverMatchingService();
    }

    @Override
    public Void handleRequest(ScheduledEvent event, Context context) {
        try {
            System.out.println("Driver matching service handler invoked");

            // Process the ride request
            driverMatchingService.processRideRequest(event);

        } catch (Exception e) {
            System.err.println("[ERROR] Failed to process driver matching: " + e.getMessage());
            throw new RuntimeException("Failed to process driver matching", e);
        }

        return null;
    }
}
