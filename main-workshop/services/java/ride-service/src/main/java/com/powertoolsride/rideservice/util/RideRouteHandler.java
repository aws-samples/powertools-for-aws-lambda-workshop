package com.powertoolsride.rideservice.util;

import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyRequestEvent;

public class RideRouteHandler {
    
    public static boolean isCreateRideRequest(APIGatewayProxyRequestEvent request) {
        return "POST".equalsIgnoreCase(request.getHttpMethod()) &&
               "/rides".equals(request.getPath());
    }
}
