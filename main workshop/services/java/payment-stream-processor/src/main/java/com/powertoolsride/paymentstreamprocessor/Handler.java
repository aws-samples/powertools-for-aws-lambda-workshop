package com.powertoolsride.paymentstreamprocessor;

import static software.amazon.lambda.powertools.logging.argument.StructuredArguments.entry;
import static software.amazon.lambda.powertools.logging.argument.StructuredArguments.entries;

import com.powertoolsride.paymentstreamprocessor.model.PaymentStreamEvent;
import com.powertoolsride.paymentstreamprocessor.service.StreamProcessorService;
import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.amazonaws.services.lambda.runtime.events.DynamodbEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import software.amazon.lambda.powertools.logging.Logging;
import software.amazon.lambda.powertools.metrics.FlushMetrics;
import software.amazon.lambda.powertools.metrics.Metrics;
import software.amazon.lambda.powertools.metrics.MetricsFactory;
import software.amazon.lambda.powertools.metrics.model.MetricUnit;
import software.amazon.lambda.powertools.tracing.Tracing;

import java.util.HashMap;
import java.util.Map;

public class Handler implements RequestHandler<DynamodbEvent, Void> {
    private static final Logger logger = LoggerFactory.getLogger(Handler.class);
    private static final Metrics metrics = MetricsFactory.getMetricsInstance();
    private final StreamProcessorService streamProcessorService;

    public Handler() {
        this.streamProcessorService = new StreamProcessorService();
    }

    @Logging
    @FlushMetrics(captureColdStart = true)
    @Tracing
    @Override
    public Void handleRequest(DynamodbEvent event, Context context) {
        int successCount = 0;
        int failureCount = 0;
        int totalCount = event.getRecords().size();

        try {
            for (DynamodbEvent.DynamodbStreamRecord record : event.getRecords()) {
                metrics.addMetric("ExtractedRecords", 1, MetricUnit.COUNT);
                PaymentStreamEvent extractedData = streamProcessorService.extractRecord(record);

                // Add correlation ID to MDC for tracking
                if (extractedData.correlationId() != null) {
                    MDC.put("correlation_id", extractedData.correlationId());
                }

                streamProcessorService.processSingleRecord(extractedData);

                logger.info("RECORD PROCESSED", 
                    entry("payment_id", extractedData.paymentId()),
                    entry("ride_id", extractedData.rideId()));
                successCount++;
            }
            
            logger.info("BATCH COMPLETE",
                    entry("success_count", successCount),
                    entry("failure_count", failureCount),
                    entry("total_records", totalCount));

        } catch (StreamProcessorService.BatchExcpetion ex) {
            failureCount++;

            logger.error("BATCH FAILURES",
                    entry("payment_id", ex.getPaymentStreamEvent().paymentId()),
                    entry("success_count", successCount),
                    entry("failure_count", failureCount),
                    entry("total_records", totalCount));
            throw ex;
        } finally {
            metrics.addMetric("BatchSize", totalCount, MetricUnit.COUNT);
            metrics.addMetric("SuccessfulRecords", successCount, MetricUnit.COUNT);
            metrics.addMetric("FailedRecords", failureCount, MetricUnit.COUNT);
        }
        throw new RuntimeException("Simulated failure to trigger stream retry");
    }
}