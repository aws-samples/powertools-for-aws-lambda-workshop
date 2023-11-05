package com.amazonaws.powertools.workshop;

import static com.amazonaws.powertools.workshop.Utils.getLabels;
import static com.amazonaws.powertools.workshop.Utils.reportImageIssue;
import static java.time.temporal.ChronoUnit.SECONDS;

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
import software.amazon.lambda.powertools.parameters.ParamManager;
import software.amazon.lambda.powertools.parameters.SSMProvider;
import software.amazon.lambda.powertools.parameters.SecretsProvider;
import software.amazon.lambda.powertools.parameters.transform.Transformer;
import software.amazon.lambda.powertools.tracing.Tracing;
import software.amazon.lambda.powertools.tracing.TracingUtils;

/**
 * Lambda function handler for image (person) detection
 */
public class Module2HandlerComplete implements RequestHandler<DynamodbEvent, StreamsEventResponse> {
    private static final Logger LOGGER = LogManager.getLogger(Module2Handler.class);
    private static final String BUCKET_NAME_FILES = System.getenv("BUCKET_NAME_FILES");
    private static final String API_URL_PARAMETER_NAME = System.getenv("API_URL_PARAMETER_NAME");
    private static final String API_KEY_SECRET_NAME = System.getenv("API_KEY_SECRET_NAME");
    private static final SSMProvider ssmProvider = ParamManager.getSsmProvider();
    private static final SecretsProvider secretsProvider = ParamManager.getSecretsProvider();
    private final BatchMessageHandler<DynamodbEvent, StreamsEventResponse> handler = new BatchMessageHandlerBuilder()
            .withDynamoDbBatchHandler()
            .buildWithRawMessageHandler(this::recordHandler);


    private String getSecret(String secretName) {
        return secretsProvider
                .withMaxAge(900, SECONDS)
                .get(secretName);
    }

    private String getApiUrl(String apiParameterName) {
        APIHost apiHost = ssmProvider
                .withMaxAge(900, SECONDS)
                .withTransformation(Transformer.json)
                .get(apiParameterName, APIHost.class);
        return apiHost.getUrl();
    }

    /**
     * Process each dynamoDB stream record, automatically handle partial batch failure
     */
    @Tracing
    private void recordHandler(DynamodbEvent.DynamodbStreamRecord dynamodbStreamRecord, Context context) {
        // Since we are applying the filter at the DynamoDB Stream level,
        // we know that the record has a NewImage otherwise the record would not be here
        Map<String, AttributeValue> data = dynamodbStreamRecord.getDynamodb().getNewImage();
        String fileId = data.get("id").getS();
        String userId = data.get("userId").getS();
        String transformedFileKey = data.get("transformedFileKey").getS();

        if(context.getRemainingTimeInMillis() > 1000){
            LOGGER.warn("Invocation is about to time out, marking all remaining records as failed. fileId {}, userId {}", fileId, userId);
            throw new Error("Time remaining <1s, marking record as failed to retry later");
        }

        // Add the file id and user id to the logger so that all the logs after this
        // will have these attributes, and we can correlate them
        LoggingUtils.appendKey("fileId", fileId);
        LoggingUtils.appendKey("userId", userId);

        // Add the file id and user id to the segment, so that it can be
        TracingUtils.putAnnotation("fileId", fileId);
        TracingUtils.putAnnotation("userId", userId);
        try {
            // Get the labels from Rekognition
            getLabels(BUCKET_NAME_FILES, fileId, userId, transformedFileKey);
        } catch (ImageDetectionException e) {
            // If no person was found in the image, report the issue to the API for further investigation
            LOGGER.warn("No person found in the image");
            // Get the apiUrl and apiKey from SSM and Secrets Manager respectively
            String apiUrl = getApiUrl(API_URL_PARAMETER_NAME);
            String apiKey = getSecret(API_KEY_SECRET_NAME);
            reportImageIssue(fileId, userId, apiUrl, apiKey);
        } finally {
            // Remove the file id and user id from the logger
            LoggingUtils.removeKey("fileId");
            LoggingUtils.removeKey("userId");
        }
    }

    @Logging(logEvent = true)
    @Tracing
    @Metrics(captureColdStart = true)
    public StreamsEventResponse handleRequest(final DynamodbEvent event, final Context context) {
        return handler.processBatch(event, context);
    }

}