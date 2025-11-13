package com.powertoolsride.paymentprocessor.service;

import com.powertoolsride.paymentprocessor.model.*;
import com.powertoolsride.paymentprocessor.repository.PaymentRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import software.amazon.awssdk.services.eventbridge.EventBridgeClient;
import software.amazon.awssdk.services.eventbridge.model.PutEventsRequest;
import software.amazon.awssdk.services.eventbridge.model.PutEventsRequestEntry;
import software.amazon.awssdk.services.eventbridge.model.PutEventsResponse;

import java.time.Instant;
import java.util.Random;
import java.util.UUID;

public class PaymentService {
    private final PaymentRepository paymentRepository;
    private final EventBridgeClient eventBridge;
    private final ObjectMapper objectMapper;
    private final String eventBusName;
    private final Random random;
    private String correlationId;

    public PaymentService() {
        this.paymentRepository = new PaymentRepository();
        this.eventBridge = EventBridgeClient.builder()
            .overrideConfiguration(software.amazon.awssdk.core.client.config.ClientOverrideConfiguration.builder()
                .addExecutionInterceptor(new com.amazonaws.xray.interceptors.TracingInterceptor())
                .build())
            .build();
        this.objectMapper = new ObjectMapper();
        this.eventBusName = System.getenv("EVENT_BUS_NAME");
        this.random = new Random();
    }

    public PaymentResult processPayment(DriverAssignedEvent driverEvent) {
        correlationId = driverEvent.correlationId();

        String paymentId = UUID.randomUUID().toString();

        Payment payment = new Payment(
            paymentId,
            driverEvent.rideId(),
            driverEvent.riderId(),
            driverEvent.driverId(),
            driverEvent.estimatedPrice(),
            driverEvent.paymentMethod(),
            "processing",
            null,
            null,
            Instant.now().toString(),
            Instant.now().toString()
        );

        paymentRepository.createPayment(payment, correlationId);

        PaymentGatewayResult gatewayResult = simulatePaymentGateway(payment);

        // Update payment status based on gateway result
        if (gatewayResult.success()) {
            paymentRepository.updatePaymentStatus(paymentId, "completed", gatewayResult.transactionId());

            // Only send PaymentCompleted event if payment succeeded
            PaymentCompletedEvent completedEvent = new PaymentCompletedEvent(
                "PaymentCompleted",
                paymentId,
                driverEvent.rideId(),
                driverEvent.riderId(),
                driverEvent.driverId(),
                payment.amount(),
                payment.paymentMethod(),
                gatewayResult.transactionId(),
                Instant.now().toString(),
                correlationId
            );

            publishEvent(completedEvent, "PaymentCompleted");
        } else {
            // Update status to failed if payment gateway failed
            paymentRepository.updatePaymentStatus(paymentId, "failed", null, gatewayResult.errorMessage());
        }

        return new PaymentResult(
            gatewayResult.success(),
            payment,
            gatewayResult.transactionId(),
            gatewayResult.errorMessage(),
            gatewayResult.processingTimeMs()
        );
    }

    public PaymentGatewayResult simulatePaymentGateway(Payment payment) {
        long startTime = System.currentTimeMillis();

        String paymentMethod = payment.paymentMethod().toLowerCase();

        try {
            if (paymentMethod.equals("somecompany-pay")) {
                Thread.sleep(5000);
            } else {
                Thread.sleep(100 + random.nextInt(200));
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }

        long processingTime = System.currentTimeMillis() - startTime;
        
        // Simulate 5% failure rate
        boolean success = random.nextInt(100) >= 5;
        String transactionId = success ? "txn_" + UUID.randomUUID().toString().substring(0, 8) : null;
        String errorMessage = success ? null : "Payment gateway declined transaction";

        return new PaymentGatewayResult(
            success,
            transactionId,
            errorMessage,
            processingTime
        );
    }

    public void publishEvent(Object event, String detailType) {
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
            .source("payment-processor")
            .detailType(detailType)
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
