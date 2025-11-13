package com.powertoolsride.drivermatchingservice.service;

import com.powertoolsride.drivermatchingservice.model.*;
import com.powertoolsride.drivermatchingservice.repository.DriverRepository;
import com.powertoolsride.drivermatchingservice.repository.RideRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import software.amazon.awssdk.services.eventbridge.EventBridgeClient;
import software.amazon.awssdk.services.eventbridge.model.PutEventsRequest;
import software.amazon.awssdk.services.eventbridge.model.PutEventsRequestEntry;
import software.amazon.awssdk.services.eventbridge.model.PutEventsResponse;

import java.time.Instant;
import java.util.List;

import static software.amazon.lambda.powertools.utilities.EventDeserializer.extractDataFrom;

public class DriverMatchingService {
    private final DriverRepository driverRepository;
    private final RideRepository rideRepository;
    private final EventBridgeClient eventBridge;
    private final ObjectMapper objectMapper;
    private final String eventBusName;

    public DriverMatchingService() {
        this.driverRepository = new DriverRepository();
        this.rideRepository = new RideRepository();
        this.eventBridge = EventBridgeClient.builder()
            .overrideConfiguration(software.amazon.awssdk.core.client.config.ClientOverrideConfiguration.builder()
                .addExecutionInterceptor(new com.amazonaws.xray.interceptors.TracingInterceptor())
                .build())
            .build();
        this.objectMapper = new ObjectMapper();
        this.eventBusName = System.getenv("EVENT_BUS_NAME");
    }

    public DriverMatchingResult processRideRequest(com.amazonaws.services.lambda.runtime.events.ScheduledEvent event) {
        PriceCalculatedEvent priceEvent = extractDataFrom(event).as(PriceCalculatedEvent.class);

        List<Driver> availableDrivers = driverRepository.getAvailableDrivers();

        DriverMatchingResult result = new DriverMatchingResult();
        result.setRideId(priceEvent.rideId());
        result.setAvailableDriversCount(availableDrivers.size());

        if (availableDrivers.isEmpty()) {
            rideRepository.updateRideWithDriver(priceEvent.rideId(), "", "no-driver-available");
            result.setSuccess(false);
            result.setErrorMessage("No available drivers");
            return result;
        }

        Driver selectedDriver = availableDrivers.get(0);

        // Commented out for demo purposes - we don't need to track real status in the DB
        // driverRepository.updateDriverStatus(selectedDriver.driverId(), "busy");
        rideRepository.updateRideWithDriver(priceEvent.rideId(), selectedDriver.driverId(), "driver-assigned");

        DriverAssignedEvent driverAssignedEvent = createDriverAssignedEvent(priceEvent, selectedDriver);
        publishDriverAssignedEvent(driverAssignedEvent);

        result.setSuccess(true);
        result.setAssignedDriverId(selectedDriver.driverId());
        return result;
    }

    public Driver selectClosestDriver(List<Driver> drivers, Location pickupLocation) {
        Driver closestDriver = drivers.get(0);
        double minDistance = Double.MAX_VALUE;

        for (Driver driver : drivers) {
            double distance = calculateDistance(
                pickupLocation.latitude(),
                pickupLocation.longitude(),
                driver.currentLocation().latitude(),
                driver.currentLocation().longitude()
            );

            if (distance < minDistance) {
                minDistance = distance;
                closestDriver = driver;
            }
        }

        return closestDriver;
    }

    public double calculateDistance(double lat1, double lon1, double lat2, double lon2) {
        final double R = 6371;

        double latDistance = Math.toRadians(lat2 - lat1);
        double lonDistance = Math.toRadians(lon2 - lon1);
        
        double a = Math.sin(latDistance / 2) * Math.sin(latDistance / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(lonDistance / 2) * Math.sin(lonDistance / 2);
        
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        
        return R * c;
    }

    public DriverAssignedEvent createDriverAssignedEvent(PriceCalculatedEvent event, Driver driver) {
        return new DriverAssignedEvent(
            "DriverAssigned",
            event.rideId(),
            event.riderId(),
            event.riderName(),
            driver.driverId(),
            driver.driverName(),
            event.estimatedPrice(),
            event.basePrice(),
            event.surgeMultiplier(),
            event.pickupLocation(),
            event.dropoffLocation(),
            0,
            0.0,
            event.paymentMethod(),
            Instant.now().toString(),
            event.correlationId()
        );
    }

    public void publishDriverAssignedEvent(DriverAssignedEvent event) {
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
            .source("driver-matching-service")
            .detailType("DriverAssigned")
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
