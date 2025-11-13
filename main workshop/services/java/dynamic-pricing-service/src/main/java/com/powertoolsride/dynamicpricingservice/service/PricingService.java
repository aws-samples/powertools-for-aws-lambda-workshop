package com.powertoolsride.dynamicpricingservice.service;

import com.powertoolsride.dynamicpricingservice.model.PriceCalculatedEvent;
import com.powertoolsride.dynamicpricingservice.model.PriceCalculation;
import com.powertoolsride.dynamicpricingservice.model.PricingResult;
import com.powertoolsride.dynamicpricingservice.model.RideCreatedEvent;
import com.powertoolsride.dynamicpricingservice.repository.PricingRepository;
import com.amazonaws.services.lambda.runtime.events.ScheduledEvent;
import com.fasterxml.jackson.databind.ObjectMapper;
import software.amazon.awssdk.services.eventbridge.EventBridgeClient;
import software.amazon.awssdk.services.eventbridge.model.PutEventsRequest;
import software.amazon.awssdk.services.eventbridge.model.PutEventsRequestEntry;
import software.amazon.awssdk.services.eventbridge.model.PutEventsResponse;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.Map;
import java.util.Random;

import static software.amazon.lambda.powertools.utilities.EventDeserializer.extractDataFrom;

public class PricingService {
    private static final BigDecimal MIN_BASE_PRICE = new BigDecimal("5.0");
    private static final BigDecimal MAX_BASE_PRICE = new BigDecimal("20.0");
    
    private final PricingRepository repository;
    private final EventBridgeClient eventBridge;
    private final ObjectMapper objectMapper;
    private final String eventBusName;
    private final Random random;

    public PricingService() {
        this.repository = new PricingRepository();
        this.eventBridge = EventBridgeClient.builder()
            .overrideConfiguration(software.amazon.awssdk.core.client.config.ClientOverrideConfiguration.builder()
                .addExecutionInterceptor(new com.amazonaws.xray.interceptors.TracingInterceptor())
                .build())
            .build();
        this.objectMapper = new ObjectMapper();
        this.eventBusName = System.getenv("EVENT_BUS_NAME");
        this.random = new Random();
    }

    public PricingResult processRideCreatedEvent(ScheduledEvent event, BigDecimal rushHourMultiplier) {
        RideCreatedEvent rideEvent = extractDataFrom(event).as(RideCreatedEvent.class);
        
        return processRideForPricing(rideEvent, rushHourMultiplier);
    }

    public PricingResult processRideForPricing(RideCreatedEvent rideEvent, BigDecimal rushHourMultiplier) {
        if (rideEvent.pickupLocation() == null || rideEvent.destinationLocation() == null) {
            return new PricingResult(
                rideEvent.rideId(),
                rideEvent.riderId(),
                null,
                null,
                null,
                false,
                "Invalid request: missing required fields"
            );
        }

        PriceCalculation calculation = calculatePrice(rushHourMultiplier);
        repository.savePriceCalculation(rideEvent.rideId(), calculation);
        
        PriceCalculatedEvent priceEvent = createPriceCalculatedEvent(rideEvent, calculation);
        publishPriceCalculatedEvent(priceEvent);

        return new PricingResult(
            rideEvent.rideId(),
            rideEvent.riderId(),
            calculation.finalPrice(),
            calculation.basePrice(),
            calculation.surgeMultiplier(),
            true,
            null
        );
    }

    public PriceCalculation calculatePrice(BigDecimal rushHourMultiplier) {
        double randomValue = random.nextDouble();
        BigDecimal range = MAX_BASE_PRICE.subtract(MIN_BASE_PRICE);
        BigDecimal basePrice = MIN_BASE_PRICE.add(range.multiply(BigDecimal.valueOf(randomValue)));
        basePrice = basePrice.setScale(2, RoundingMode.HALF_UP);
        
        BigDecimal finalPrice = basePrice.multiply(rushHourMultiplier).setScale(2, RoundingMode.HALF_UP);
        
        return new PriceCalculation(basePrice, finalPrice, rushHourMultiplier, Instant.now().toString());
    }

    public PriceCalculatedEvent createPriceCalculatedEvent(RideCreatedEvent rideEvent, PriceCalculation calculation) {
        return new PriceCalculatedEvent(
            rideEvent.rideId(),
            rideEvent.riderId(),
            rideEvent.riderName(),
            rideEvent.pickupLocation(),
            rideEvent.destinationLocation(),
            calculation.finalPrice(),
            calculation.basePrice(),
            calculation.surgeMultiplier(),
            rideEvent.paymentMethod(),
            Instant.now().toString(),
            rideEvent.correlationId()
        );
    }

    public void publishPriceCalculatedEvent(PriceCalculatedEvent event) {
        if (eventBusName == null || eventBusName.isEmpty()) {
            return;
        }

        String eventDetailJson;
        try {
            eventDetailJson = objectMapper.writeValueAsString(event);
        } catch (Exception e) {
            throw new RuntimeException("Failed to serialize event", e);
        }

        PutEventsRequestEntry entry = PutEventsRequestEntry.builder()
            .source("dynamic-pricing-service")
            .detailType("PriceCalculated")
            .detail(eventDetailJson)
            .eventBusName(eventBusName)
            .build();

        PutEventsRequest request = PutEventsRequest.builder()
            .entries(entry)
            .build();

        PutEventsResponse response = eventBridge.putEvents(request);
        
        if (response.failedEntryCount() > 0) {
            throw new RuntimeException("Failed to send event: " + response.entries().get(0).errorCode());
        }
    }
}
