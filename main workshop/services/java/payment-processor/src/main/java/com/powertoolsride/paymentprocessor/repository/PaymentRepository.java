package com.powertoolsride.paymentprocessor.repository;

import com.powertoolsride.paymentprocessor.model.Payment;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.*;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

public class PaymentRepository {
    private final DynamoDbClient dynamoDb;
    private final String paymentsTableName;

    public PaymentRepository() {
        this.dynamoDb = DynamoDbClient.builder()
            .overrideConfiguration(software.amazon.awssdk.core.client.config.ClientOverrideConfiguration.builder()
                .addExecutionInterceptor(new com.amazonaws.xray.interceptors.TracingInterceptor())
                .build())
            .build();
        String tableName = System.getenv("PAYMENTS_TABLE_NAME");
        this.paymentsTableName = (tableName != null && !tableName.isEmpty()) ? tableName : "Payments";
    }

    public void createPayment(Payment payment, String correlationId) {
        Map<String, AttributeValue> item = new HashMap<>();
        item.put("paymentId", AttributeValue.builder().s(payment.paymentId()).build());
        item.put("rideId", AttributeValue.builder().s(payment.rideId()).build());
        item.put("riderId", AttributeValue.builder().s(payment.riderId()).build());
        item.put("driverId", AttributeValue.builder().s(payment.driverId()).build());
        item.put("amount", AttributeValue.builder().n(payment.amount().toString()).build());
        item.put("paymentMethod", AttributeValue.builder().s(payment.paymentMethod()).build());
        item.put("status", AttributeValue.builder().s(payment.status()).build());
        item.put("createdAt", AttributeValue.builder().s(payment.createdAt()).build());
        item.put("updatedAt", AttributeValue.builder().s(payment.updatedAt()).build());

        if (payment.failureReason() != null && !payment.failureReason().isEmpty()) {
            item.put("failureReason", AttributeValue.builder().s(payment.failureReason()).build());
        }

        if (payment.transactionId() != null && !payment.transactionId().isEmpty()) {
            item.put("transactionId", AttributeValue.builder().s(payment.transactionId()).build());
        }

        if (correlationId != null && !correlationId.isEmpty()) {
            item.put("correlationId", AttributeValue.builder().s(correlationId).build());
        }

        PutItemRequest request = PutItemRequest.builder()
            .tableName(paymentsTableName)
            .item(item)
            .build();

        dynamoDb.putItem(request);
    }

    public void updatePaymentStatus(String paymentId, String status, String transactionId) {
        updatePaymentStatus(paymentId, status, transactionId, null);
    }

    public void updatePaymentStatus(String paymentId, String status, String transactionId, String failureReason) {
        Map<String, AttributeValue> key = new HashMap<>();
        key.put("paymentId", AttributeValue.builder().s(paymentId).build());

        Map<String, AttributeValue> expressionAttributeValues = new HashMap<>();
        expressionAttributeValues.put(":status", AttributeValue.builder().s(status).build());
        expressionAttributeValues.put(":updatedAt", AttributeValue.builder().s(Instant.now().toString()).build());

        Map<String, String> expressionAttributeNames = new HashMap<>();
        expressionAttributeNames.put("#status", "status");

        StringBuilder updateExpression = new StringBuilder("SET #status = :status, updatedAt = :updatedAt");

        if (transactionId != null && !transactionId.isEmpty()) {
            expressionAttributeValues.put(":transactionId", AttributeValue.builder().s(transactionId).build());
            updateExpression.append(", transactionId = :transactionId");
        }

        if (failureReason != null && !failureReason.isEmpty()) {
            expressionAttributeValues.put(":failureReason", AttributeValue.builder().s(failureReason).build());
            updateExpression.append(", failureReason = :failureReason");
        }

        UpdateItemRequest request = UpdateItemRequest.builder()
            .tableName(paymentsTableName)
            .key(key)
            .updateExpression(updateExpression.toString())
            .expressionAttributeNames(expressionAttributeNames)
            .expressionAttributeValues(expressionAttributeValues)
            .build();

        dynamoDb.updateItem(request);
    }
}
