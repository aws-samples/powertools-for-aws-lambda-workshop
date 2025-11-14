package com.powertoolsride.dynamicpricingservice;

import com.powertoolsride.dynamicpricingservice.service.PricingService;
import com.powertoolsride.dynamicpricingservice.service.RushHourService;
import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.amazonaws.services.lambda.runtime.events.ScheduledEvent;

import java.math.BigDecimal;

public class Handler implements RequestHandler<ScheduledEvent, Void> {
    private final PricingService pricingService;
    private final RushHourService rushHourService;

    public Handler() {
        this.pricingService = new PricingService();
        this.rushHourService = new RushHourService();
    }

    @Override
    public Void handleRequest(ScheduledEvent event, Context context) {
        try {
            // Retrieve rush hour multiplier from Secrets Manager
            BigDecimal rushHourMultiplier = rushHourService.getRushHourMultiplier();
            System.out.println("Retrieved rush hour multiplier: " + rushHourMultiplier);

            // Process the pricing
            pricingService.processRideCreatedEvent(event, rushHourMultiplier);
        } catch (Exception e) {
            System.err.println("[ERROR] PRICING_ERROR: " + e.getMessage());
            throw new RuntimeException("Failed to process ride pricing", e);
        }

        return null;
    }
}
