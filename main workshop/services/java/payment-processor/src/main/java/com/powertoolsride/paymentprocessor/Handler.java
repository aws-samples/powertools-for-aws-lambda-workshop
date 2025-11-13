package com.powertoolsride.paymentprocessor;

import com.powertoolsride.paymentprocessor.model.DriverAssignedEvent;
import com.powertoolsride.paymentprocessor.model.PaymentResult;
import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.amazonaws.services.lambda.runtime.events.ScheduledEvent;
import com.fasterxml.jackson.databind.ObjectMapper;

public class Handler implements RequestHandler<ScheduledEvent, Void> {
    private final PaymentProcessor paymentProcessor;
    private final ObjectMapper objectMapper;

    public Handler() {
        this.paymentProcessor = new PaymentProcessor();
        this.objectMapper = new ObjectMapper();
    }

    @Override
    public Void handleRequest(ScheduledEvent event, Context context) {
        try {
            System.out.println("Payment processor handler invoked");

            // Extract DriverAssignedEvent from the event detail
            java.util.Map<String, Object> detail = event.getDetail();
            DriverAssignedEvent driverEvent = objectMapper.convertValue(detail, DriverAssignedEvent.class);

            // Process the payment
            PaymentResult result = paymentProcessor.processPayment(driverEvent);

            if (result.success()) {
                System.out.println("Payment completed successfully: " + result.payment().paymentId() + 
                                 " for $" + result.payment().amount());
            } else {
                System.out.println("❌ Payment failed: " + result.errorMessage());
            }

        } catch (Exception e) {
            System.err.println("[ERROR] Failed to process payment: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Failed to process payment", e);
        }

        return null;
    }
}
