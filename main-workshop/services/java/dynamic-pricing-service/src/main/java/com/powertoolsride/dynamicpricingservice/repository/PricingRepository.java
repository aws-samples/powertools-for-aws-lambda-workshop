package com.powertoolsride.dynamicpricingservice.repository;

import com.powertoolsride.dynamicpricingservice.model.PriceCalculation;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;
import software.amazon.awssdk.services.dynamodb.model.PutItemRequest;

import java.util.HashMap;
import java.util.Map;

public class PricingRepository {
    private final DynamoDbClient dynamoDb;
    private final String tableName;

    public PricingRepository() {
        this.dynamoDb = DynamoDbClient.builder()
            .overrideConfiguration(software.amazon.awssdk.core.client.config.ClientOverrideConfiguration.builder()
                .addExecutionInterceptor(new com.amazonaws.xray.interceptors.TracingInterceptor())
                .build())
            .build();
        String tableName = System.getenv("PRICING_TABLE_NAME");
        this.tableName = (tableName != null && !tableName.isEmpty()) ? tableName : "Pricing";
    }

    public void savePriceCalculation(String rideId, PriceCalculation calculation) {
        Map<String, AttributeValue> item = new HashMap<>();
        item.put("rideId", AttributeValue.builder().s(rideId).build());
        item.put("basePrice", AttributeValue.builder().n(String.format("%.2f", calculation.basePrice())).build());
        item.put("finalPrice", AttributeValue.builder().n(String.format("%.2f", calculation.finalPrice())).build());
        item.put("surgeMultiplier", AttributeValue.builder().n(String.format("%.2f", calculation.surgeMultiplier())).build());
        item.put("createdAt", AttributeValue.builder().s(calculation.createdAt()).build());

        PutItemRequest request = PutItemRequest.builder()
            .tableName(tableName)
            .item(item)
            .build();

        dynamoDb.putItem(request);
    }
}
