package com.powertoolsride.paymentprocessor;

import com.powertoolsride.paymentprocessor.model.DriverAssignedEvent;
import com.powertoolsride.paymentprocessor.model.PaymentResult;
import com.powertoolsride.paymentprocessor.service.PaymentService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;

import java.util.HashMap;
import java.util.Map;

import static software.amazon.lambda.powertools.logging.argument.StructuredArguments.entries;

public class PaymentProcessor {
    private static final Logger LOGGER = LoggerFactory.getLogger(PaymentProcessor.class);
    private final PaymentService paymentService;

    public PaymentProcessor() {
        this.paymentService = new PaymentService();
    }

    public PaymentResult processPayment(DriverAssignedEvent driverEvent) {
        PaymentResult result = paymentService.processPayment(driverEvent);

        if (result.success()) {
            MDC.put("ride_id", result.payment().rideId());
            MDC.put("rider_id", result.payment().riderId());
            MDC.put("payment_id", result.payment().paymentId());
            MDC.put("payment_amount", result.payment().amount().toString());
            MDC.put("payment_method", result.payment().paymentMethod());

            LOGGER.info("Payment created");
        }

        return result;
    }
}
