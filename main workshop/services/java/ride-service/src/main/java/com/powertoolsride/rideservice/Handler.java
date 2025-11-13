package com.powertoolsride.rideservice;

import com.powertoolsride.rideservice.model.RideCreationResult;
import com.powertoolsride.rideservice.service.RideService;
import com.powertoolsride.rideservice.util.RideRouteHandler;
import com.powertoolsride.rideservice.util.RouteHandler;
import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyRequestEvent;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyResponseEvent;

import java.util.Map;

public class Handler implements RequestHandler<APIGatewayProxyRequestEvent, APIGatewayProxyResponseEvent> {
    private final RideService rideService;

    public Handler() {
        this.rideService = new RideService();
    }

    @Override
    public APIGatewayProxyResponseEvent handleRequest(APIGatewayProxyRequestEvent request, Context context) {
        try {
            if (!RideRouteHandler.isCreateRideRequest(request)) {
                return RouteHandler.notFound("Endpoint not found");
            }

            if (request.getBody() == null || request.getBody().isEmpty()) {
                return RouteHandler.badRequest("Request body is required");
            }

            String deviceId = getDeviceIdFromHeaders(request.getHeaders());
            RideCreationResult result = rideService.createRideAsync(request, deviceId);

            if (!result.isSuccess()) {
                System.out.println("Error creating ride: " + result.getErrorMessage());
                return RouteHandler.handleError();
            }

            System.out.println("Ride created successfully for rider " + result.getRide().riderId());

            return RouteHandler.created(result.getRide());

        } catch (Exception ex) {
            System.out.println("Unexpected error: " + ex.getMessage());
            return RouteHandler.handleError();
        }
    }

    private String getDeviceIdFromHeaders(Map<String, String> headers) {

        // Check for device ID header (case-insensitive)
        for (Map.Entry<String, String> entry : headers.entrySet()) {
            if (entry.getKey() != null && entry.getKey().equalsIgnoreCase("x-device-id")) {
                return entry.getValue();
            }
        }

        throw new RuntimeException("Header not found");
    }
}
