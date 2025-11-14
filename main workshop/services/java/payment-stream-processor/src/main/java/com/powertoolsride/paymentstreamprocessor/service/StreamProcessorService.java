package com.powertoolsride.paymentstreamprocessor.service;

import com.powertoolsride.paymentstreamprocessor.model.PaymentCompletedEvent;
import com.powertoolsride.paymentstreamprocessor.model.PaymentStreamEvent;
import com.amazonaws.services.lambda.runtime.events.DynamodbEvent;
import com.amazonaws.services.lambda.runtime.events.models.dynamodb.AttributeValue;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import software.amazon.awssdk.services.eventbridge.EventBridgeClient;
import software.amazon.awssdk.services.eventbridge.model.PutEventsRequest;
import software.amazon.awssdk.services.eventbridge.model.PutEventsRequestEntry;
import software.amazon.awssdk.services.eventbridge.model.PutEventsResponse;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;

public class StreamProcessorService {
    private final EventBridgeClient eventBridge;
    private final String eventBusName;
    private final ObjectMapper objectMapper;

    public StreamProcessorService() {
        this.eventBridge = EventBridgeClient.builder().build();
        this.eventBusName = System.getenv("EVENT_BUS_NAME");
        this.objectMapper = new ObjectMapper();
    }

    public PaymentStreamEvent extractRecord(DynamodbEvent.DynamodbStreamRecord record) {
        try {
            Thread.sleep(500);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }

        Map<String, AttributeValue> newImage = record.getDynamodb().getNewImage();

        String paymentId = getAttributeValue(newImage, "paymentId");
        String rideId = getAttributeValue(newImage, "rideId");
        String riderId = getAttributeValue(newImage, "riderId");
        String driverId = getAttributeValue(newImage, "driverId");
        String correlationId = getAttributeValue(newImage, "correlationId");
        String amount = getAttributeValue(newImage, "amount");
        String paymentMethod = getAttributeValue(newImage, "paymentMethod");
        String transactionId = getAttributeValue(newImage, "transactionId");
        String status = getAttributeValue(newImage, "status");

        return new PaymentStreamEvent(
            true,
            paymentId,
            rideId,
            riderId,
            driverId,
            correlationId,
            amount,
            paymentMethod,
            transactionId,
            status
        );
    }

    public PaymentStreamEvent processSingleRecord(PaymentStreamEvent extractedData) {
        if (extractedData.paymentId() != null && extractedData.paymentId().contains("POISON")) {
            throw new BatchExcpetion("Poison record detected: " + extractedData.paymentId(), extractedData);
        }

        processPaymentCompletion(extractedData);
        return extractedData;
    }

    public void processPaymentCompletion(PaymentStreamEvent extractedData) {
        // Skip test/synthetic data first (before any processing)
        if (eventBusName == null || eventBusName.isEmpty() || "rider-batch-test".equals(extractedData.riderId())) {
            return;
        }
        
        // Only process payments with 'completed' status
        if (!"completed".equals(extractedData.status())) {
            // Skip failed or processing payments - don't send completion events
            return;
        }

        BigDecimal amountDecimal;
        try {
            amountDecimal = new BigDecimal(extractedData.amount());
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("Invalid amount format: " + extractedData.amount(), e);
        }

        PaymentCompletedEvent completionEvent = new PaymentCompletedEvent(
            "PaymentCompleted",
            extractedData.paymentId(),
            extractedData.rideId(),
            extractedData.riderId(),
            extractedData.driverId(),
            amountDecimal,
            extractedData.paymentMethod(),
            extractedData.transactionId(),
            Instant.now().toString(),
            extractedData.correlationId()
        );

        sendEventToEventBridge("PaymentCompleted", completionEvent);
    }

    public void sendEventToEventBridge(String detailType, PaymentCompletedEvent eventDetail) {
        String eventDetailJson;
        try {
            eventDetailJson = objectMapper.writeValueAsString(eventDetail);
        } catch (Exception e) {
            throw new RuntimeException("Failed to serialize event", e);
        }

        PutEventsRequestEntry entry = PutEventsRequestEntry.builder()
            .source("payment-stream-processor")
            .detailType(detailType)
            .detail(eventDetailJson)
            .eventBusName(eventBusName)
            .build();

        PutEventsRequest request = PutEventsRequest.builder()
            .entries(entry)
            .build();

        PutEventsResponse result = eventBridge.putEvents(request);

        if (result.failedEntryCount() > 0) {
            throw new RuntimeException("Failed to send event: " + result.entries().get(0).errorCode());
        }
    }

    public String getAttributeValue(Map<String, AttributeValue> attributes, String key) {
        if (attributes == null || !attributes.containsKey(key)) {
            return null;
        }

        AttributeValue attribute = attributes.get(key);
        if (attribute.getS() != null) {
            return attribute.getS();
        } else if (attribute.getN() != null) {
            return attribute.getN();
        }
        return null;
    }

    public static class BatchExcpetion extends RuntimeException {
        private final PaymentStreamEvent paymentStreamEvent;

        public BatchExcpetion(String message, PaymentStreamEvent paymentStreamEvent) {
            super(message);
            this.paymentStreamEvent = paymentStreamEvent;
        }

        public PaymentStreamEvent getPaymentStreamEvent() {
            return paymentStreamEvent;
        }
    }
}
