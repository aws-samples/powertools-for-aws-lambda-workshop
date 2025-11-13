package com.powertoolsride.rideservice.util;

import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyResponseEvent;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;

import java.util.HashMap;
import java.util.Map;

public class RouteHandler {
    private static final ObjectMapper objectMapper;
    
    static {
        objectMapper = new ObjectMapper();
        objectMapper.setPropertyNamingStrategy(PropertyNamingStrategies.LOWER_CAMEL_CASE);
    }

    public static APIGatewayProxyResponseEvent handleError() {
        Map<String, String> errorBody = new HashMap<>();
        errorBody.put("error", "Internal Server Error");
        return buildResponse(500, errorBody);
    }

    public static APIGatewayProxyResponseEvent created(Object data) {
        return buildResponse(201, data);
    }

    public static APIGatewayProxyResponseEvent badRequest(String message) {
        Map<String, String> errorBody = new HashMap<>();
        errorBody.put("error", message);
        return buildResponse(400, errorBody);
    }

    public static APIGatewayProxyResponseEvent notFound(String message) {
        Map<String, String> errorBody = new HashMap<>();
        errorBody.put("error", message);
        return buildResponse(404, errorBody);
    }

    public static APIGatewayProxyResponseEvent buildResponse(int statusCode, Object body) {
        APIGatewayProxyResponseEvent response = new APIGatewayProxyResponseEvent();
        response.setStatusCode(statusCode);

        try {
            response.setBody(objectMapper.writeValueAsString(body));
        } catch (JsonProcessingException e) {
            response.setStatusCode(500);
            response.setBody("{\"error\": \"Failed to serialize response\"}");
        }

        return response;
    }
}
