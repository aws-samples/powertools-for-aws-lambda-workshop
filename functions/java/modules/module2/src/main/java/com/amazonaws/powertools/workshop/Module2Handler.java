package com.amazonaws.powertools.workshop;

import static com.amazonaws.powertools.workshop.Utils.getLabels;
import static com.amazonaws.powertools.workshop.Utils.reportImageIssue;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.amazonaws.services.lambda.runtime.events.DynamodbEvent;
import com.amazonaws.services.lambda.runtime.events.StreamsEventResponse;
import com.amazonaws.services.lambda.runtime.events.models.dynamodb.AttributeValue;
import java.util.Map;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import software.amazon.lambda.powertools.batch.BatchMessageHandlerBuilder;
import software.amazon.lambda.powertools.batch.handler.BatchMessageHandler;
import software.amazon.lambda.powertools.logging.Logging;
import software.amazon.lambda.powertools.logging.LoggingUtils;
import software.amazon.lambda.powertools.metrics.Metrics;
import software.amazon.lambda.powertools.tracing.Tracing;

/**
 * Lambda function handler for image (person) detection
 */
public class Module2Handler implements RequestHandler<DynamodbEvent, StreamsEventResponse> {
    private static final Logger LOGGER = LogManager.getLogger(Module2Handler.class);

    private static final String BUCKET_NAME_FILES = System.getenv("BUCKET_NAME_FILES");

    private final BatchMessageHandler<DynamodbEvent, StreamsEventResponse> handler;

    public Module2Handler() {
        handler = new BatchMessageHandlerBuilder()
                .withDynamoDbBatchHandler()
                .buildWithRawMessageHandler(this::processMessage);
    }

    @Logging(logEvent = true)
    @Tracing
    @Metrics(captureColdStart = true)
    public StreamsEventResponse handleRequest(final DynamodbEvent event, final Context context) {
        return handler.processBatch(event, context);
    }

    /**
     * Process each dynamoDB stream record, automatically handle partial batch failure
     */
    private void processMessage(DynamodbEvent.DynamodbStreamRecord dynamodbStreamRecord, Context context) {
        // Since we are applying the filter at the DynamoDB Stream level,
        // we know that the record has a NewImage otherwise the record would not be here
        Map<String, AttributeValue> data = dynamodbStreamRecord.getDynamodb().getNewImage();
        String fileId = data.get("id").getS();
        String userId = data.get("userId").getS();
        String transformedFileKey = data.get("transformedFileKey").getS();

        // Add the file id and user id to the logger so that all the logs after this
        // will have these attributes and we can correlate them
        LoggingUtils.appendKey("fileId", fileId);
        LoggingUtils.appendKey("userId", userId);
        try {
            // Get the labels from Rekognition
            getLabels(BUCKET_NAME_FILES, fileId, userId, transformedFileKey);
        } catch (ImageDetectionException e) {
            // If no person was found in the image, report the issue to the API for further investigation
            LOGGER.warn("No person found in the image");
            reportImageIssue(fileId, userId);
        } finally {
            // Remove the file id and user id from the logger
            LoggingUtils.removeKey("fileId");
            LoggingUtils.removeKey("userId");
        }
    }

}