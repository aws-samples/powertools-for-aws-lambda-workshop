package com.powertoolsride.ridecompletionservice;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.amazonaws.services.lambda.runtime.events.ScheduledEvent;
import com.powertoolsride.ridecompletionservice.model.RideCompletionResult;
import com.powertoolsride.ridecompletionservice.service.RideCompletionService;

/**
 * Lambda handler for processing payment completion events
 */
public class Handler implements RequestHandler<ScheduledEvent, Void> {
    private final RideCompletionService rideCompletionService;

    public Handler() {
        this.rideCompletionService = new RideCompletionService();
    }

    @Override
    public Void handleRequest(ScheduledEvent event, Context context) {
        try {
            RideCompletionResult result = rideCompletionService.processPaymentCompletedEvent(event);

            if (!result.success()) {
                System.out.println(
                    "ERROR: Failed to process payment event - PaymentId: " + result.paymentId() +
                    ", RideId: " + result.rideId() +
                    ", DriverId: " + result.driverId() +
                    ", ErrorType: " + result.errorType() +
                    ", Error: " + result.errorMessage());
                return null;
            }

            System.out.println(
                "Payment event processing completed successfully - PaymentId: " + result.paymentId() +
                ", RideId: " + result.rideId() +
                ", DriverId: " + result.driverId() +
                ", RideUpdateSuccessful: " + result.rideUpdateSuccessful() +
                ", DriverUpdateSuccessful: " + result.driverUpdateSuccessful());
        } catch (Exception ex) {
            System.out.println("ERROR: Unexpected error processing payment event - Error: " + ex.getMessage());
            throw ex;
        }

        return null;
    }
}
