package com.amazonaws.powertools.workshop;

import static java.lang.String.format;
import static java.nio.charset.StandardCharsets.UTF_8;

import com.amazonaws.powertools.workshop.ImageDetectionException.NoLabelsFoundException;
import com.amazonaws.powertools.workshop.ImageDetectionException.NoPersonFoundException;
import java.io.IOException;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.List;
import java.util.stream.Collectors;
import org.apache.http.client.methods.HttpPost;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import software.amazon.awssdk.auth.credentials.AwsCredentialsProvider;
import software.amazon.awssdk.auth.credentials.EnvironmentVariableCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.rekognition.RekognitionClient;
import software.amazon.awssdk.services.rekognition.model.DetectLabelsRequest;
import software.amazon.awssdk.services.rekognition.model.DetectLabelsResponse;
import software.amazon.awssdk.services.rekognition.model.Label;
import software.amazon.awssdk.utils.StringUtils;
import software.amazon.lambda.powertools.tracing.CaptureMode;
import software.amazon.lambda.powertools.tracing.Tracing;
import software.amazon.lambda.powertools.tracing.TracingUtils;

public class Utils {
    private static final Logger LOGGER = LogManager.getLogger(Utils.class);
    private static final Region AWS_REGION = Region.of(System.getenv("AWS_REGION"));
    private static final AwsCredentialsProvider credentialsProvider = EnvironmentVariableCredentialsProvider.create();

    private static final RekognitionClient rekoClient = RekognitionClient.builder()
            .region(AWS_REGION)
            .credentialsProvider(credentialsProvider)
            .build();

    private Utils() {
    }

    /**
     * Utility function that calls the Rekognition API to get the labels of an image.
     * <p>
     * If the labels **DO NOT** include `Person` or the confidence is **BELOW** 75, it throws an error.
     */
    @Tracing(captureMode = CaptureMode.ERROR)
    public static void getLabels(String bucketName,
                                 String fileId,
                                 String userId,
                                 String transformedFileKey) throws ImageDetectionException {
        TracingUtils.putAnnotation("fileId", fileId);

        DetectLabelsResponse detectLabelsResponse = rekoClient.detectLabels(DetectLabelsRequest
                .builder()
                .image(imageBuilder -> imageBuilder
                        .s3Object(s3ObjectBuilder -> s3ObjectBuilder
                                .bucket(bucketName)
                                .name(transformedFileKey)
                                .build())
                        .build())
                .build());

        List<Label> labels = detectLabelsResponse.labels();
        if (labels == null || labels.isEmpty()) {
            throw new NoLabelsFoundException(ImageMetadata.of(fileId, userId));
        }

        if (LOGGER.isInfoEnabled()) {
            LOGGER.info(labels.stream().map(label -> format("%s (%.2f)", label.name(), label.confidence()))
                    .collect(Collectors.joining(",", "labels=[", "]")));
        }

        boolean personLabel = labels.stream().anyMatch(
                label ->
                        label.name() != null && label.name().contains("Person")
                                && label.confidence() != null && label.confidence() > 75);
        if (!personLabel) {
            throw new NoPersonFoundException(ImageMetadata.of(fileId, userId));
        }
    }

    /**
     * Utility function that calls the API to report an image issue.
     */
    public static void reportImageIssue(String fileId, String userId, String apiUrl, String apiKey) {
        if (StringUtils.isEmpty(apiKey) || StringUtils.isEmpty(apiUrl)) {
            throw new IllegalStateException(format("Missing apiUrl or apiKey. apiUrl: %s, apiKey: %s", apiUrl, apiKey));
        }

        LOGGER.info("Sending report to the API");
        try {
            URL url = new URL(apiUrl);
            HttpURLConnection connection = (HttpURLConnection) url.openConnection();
            connection.setRequestMethod(HttpPost.METHOD_NAME);
            connection.setRequestProperty("Content-Type", "application/json");
            connection.setRequestProperty("x-api-key", apiKey);
            connection.setDoOutput(true);
            writeRequestBody(fileId, userId, connection);
            connection.connect();
            if (connection.getResponseCode() != 200) {
                throw new IOException(
                        format("HTTP error %d, %s", connection.getResponseCode(), connection.getResponseMessage()));
            }
        } catch (IOException e) {
            throw new RuntimeException(format("Unable to call the API for fileId %s and userId %s", fileId, userId), e);
        }
        LOGGER.info("Report sent to the API");
    }

    private static void writeRequestBody(String fileId, String userId, HttpURLConnection connection) {
        try (OutputStream os = connection.getOutputStream();
             OutputStreamWriter osw = new OutputStreamWriter(os, UTF_8)) {
            osw.write("""
                    {
                        "fileId": "%s",
                        "userId": "%s",
                    }
                    """.formatted(fileId, userId));
            osw.flush();
        } catch (IOException e) {
            throw new RuntimeException(format("Unable to call the API for fileId %s and userId %s", fileId, userId), e);
        }
    }
}
