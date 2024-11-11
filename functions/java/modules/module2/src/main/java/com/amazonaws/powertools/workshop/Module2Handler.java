package com.amazonaws.powertools.workshop;

import static com.amazonaws.powertools.workshop.Utils.getLabels;
import static com.amazonaws.powertools.workshop.Utils.reportImageIssue;
import static java.time.temporal.ChronoUnit.SECONDS;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.amazonaws.services.lambda.runtime.events.DynamodbEvent;
import com.amazonaws.services.lambda.runtime.events.models.dynamodb.AttributeValue;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.List;
import java.util.Map;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import software.amazon.awssdk.core.SdkSystemSetting;
import software.amazon.awssdk.http.urlconnection.UrlConnectionHttpClient;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.secretsmanager.SecretsManagerClient;
import software.amazon.awssdk.services.secretsmanager.model.GetSecretValueRequest;

import software.amazon.lambda.powertools.logging.Logging;
import software.amazon.lambda.powertools.logging.LoggingUtils;
import software.amazon.lambda.powertools.metrics.Metrics;
import software.amazon.lambda.powertools.tracing.Tracing;
import software.amazon.lambda.powertools.tracing.TracingUtils;

/**
 * Lambda function handler for image (person) detection
 */
public class Module2Handler implements RequestHandler<DynamodbEvent, Void> {
    private static final Logger LOGGER = LogManager.getLogger(Module2Handler.class);

    private static final String BUCKET_NAME_FILES = System.getenv("BUCKET_NAME_FILES");
    private static final String API_URL_HOST = System.getenv("API_URL_HOST");
    private static final String API_KEY_SECRET_NAME = System.getenv("API_KEY_SECRET_NAME");
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final SecretsManagerClient secretsManagerClient =
            (SecretsManagerClient.builder().httpClientBuilder(UrlConnectionHttpClient.builder()))
                    .region(Region.of(System.getenv(
                            SdkSystemSetting.AWS_REGION.environmentVariable())))
                    .build();

    private String getSecret(String secretName) {
        GetSecretValueRequest request = GetSecretValueRequest.builder().secretId(secretName).build();
        String secretValue = this.secretsManagerClient.getSecretValue(request).secretString();
        if (secretValue == null) {
            throw new RuntimeException("Secret value is null");
        }
        return secretValue;
    }

    private String getApiUrl(String apiParameterContent) {
        try {
            APIHost apiHost = objectMapper.readValue(apiParameterContent, APIHost.class);
            return apiHost.getUrl();
        } catch (JsonProcessingException e) {
            throw new RuntimeException(e);
        }
    }


    /**
     * Process each dynamoDB stream record, automatically handle partial batch failure
     */
    private void recordHandler(DynamodbEvent.DynamodbStreamRecord dynamodbStreamRecord, Context context) {
        // Since we are applying the filter at the DynamoDB Stream level,
        // we know that the record has a NewImage otherwise the record would not be here
        Map<String, AttributeValue> data = dynamodbStreamRecord.getDynamodb().getNewImage();
        String fileId = data.get("id").getS();
        String userId = data.get("userId").getS();
        String transformedFileKey = data.get("transformedFileKey").getS();

        try {
            // Get the labels from Rekognition
            getLabels(BUCKET_NAME_FILES, fileId, userId, transformedFileKey);
        } catch (ImageDetectionException e) {
            // If no person was found in the image, report the issue to the API for further investigation
            LOGGER.warn("No person found in the image");

            // Get the apiUrl and apiKey
            String apiUrl = getApiUrl(API_URL_HOST);
            String apiKey = getSecret(API_KEY_SECRET_NAME);
            reportImageIssue(fileId, userId, apiUrl, apiKey);
        }
    }

    @Logging(logEvent = true)
    @Tracing
    @Metrics(captureColdStart = true)
    public Void handleRequest(final DynamodbEvent event, final Context context) {
        List<DynamodbEvent.DynamodbStreamRecord> records = event.getRecords();
        records.forEach(record -> recordHandler(record, context));
        return null;
    }


}
