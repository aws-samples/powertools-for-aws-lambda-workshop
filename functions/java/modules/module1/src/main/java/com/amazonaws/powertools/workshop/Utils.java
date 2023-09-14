package com.amazonaws.powertools.workshop;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.net.MalformedURLException;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.entity.ByteArrayEntity;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.impl.client.HttpClients;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import software.amazon.awssdk.auth.credentials.AwsCredentialsProvider;
import software.amazon.awssdk.auth.credentials.EnvironmentVariableCredentialsProvider;
import software.amazon.awssdk.auth.signer.Aws4Signer;
import software.amazon.awssdk.auth.signer.AwsSignerExecutionAttribute;
import software.amazon.awssdk.core.ResponseBytes;
import software.amazon.awssdk.core.interceptor.ExecutionAttributes;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.http.SdkHttpFullRequest;
import software.amazon.awssdk.http.SdkHttpMethod;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;
import software.amazon.awssdk.services.dynamodb.model.GetItemRequest;
import software.amazon.awssdk.services.dynamodb.model.GetItemResponse;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

public class Utils {
    private static final Logger LOGGER = LogManager.getLogger(Utils.class);
    private static final String TABLE_NAME_FILES = System.getenv("TABLE_NAME_FILES");
    private static final String BUCKET_NAME_FILES = System.getenv("BUCKET_NAME_FILES");
    private static final String APPSYNC_ENDPOINT = System.getenv("APPSYNC_ENDPOINT");
    private static final Region AWS_REGION = Region.of(System.getenv("AWS_REGION"));
    private static final AwsCredentialsProvider credentialsProvider = EnvironmentVariableCredentialsProvider.create();

    private Utils() {}
    private static final S3Client s3Client = S3Client.builder()
            .region(AWS_REGION)
            .credentialsProvider(credentialsProvider)
            .build();

    public static final DynamoDbClient ddbClient = DynamoDbClient.builder()
            .region(AWS_REGION)
            .credentialsProvider(credentialsProvider)
            .build();

    public static Map<String, String> getImageMetadata(String key) {
        String fileId = extractFileId(key);
        GetItemResponse response = ddbClient.getItem(GetItemRequest
                .builder()
                .tableName(TABLE_NAME_FILES)
                .key(Map.of("id", AttributeValue.builder().s(fileId).build()))
                .attributesToGet("id", "userId")
                .build());

        if (!response.hasItem()) {
            throw new RuntimeException("File metadata not found");
        }

        return Map.of(
                "fileId", response.item().get("id").s(),
                "userId", response.item().get("userId").s()
                );
    }

    private static String extractFileId(String key) {
        String[] splitKey = key.split("/");
        return splitKey[splitKey.length -1].split("\\.")[0];
    }

    public static byte[] getOriginalImageBytes(S3Object s3Object) {
        ResponseBytes<GetObjectResponse> objectBytes = s3Client.getObjectAsBytes(GetObjectRequest
                .builder()
                .key(s3Object.key)
                .bucket(BUCKET_NAME_FILES)
                .build());
        return objectBytes.asByteArray();
    }

    public static void storeImageThumbnail(byte[] processedImage, String newObjectKey) {
        Map<String, String> metadata = new HashMap<>();
        metadata.put("Content-Type", "image/jpeg");
        metadata.put("Content-Length", String.valueOf(processedImage.length));

        s3Client.putObject(PutObjectRequest
                        .builder()
                        .bucket(BUCKET_NAME_FILES)
                        .key(newObjectKey)
                        .metadata(metadata)
                        .build(),
                RequestBody.fromBytes(processedImage));
    }

    private static final String UPDATE_FILE_STATUS_MUTATION = "mutation UpdateFileStatus($input: FileStatusUpdateInput) { updateFileStatus(input: $input) { id status transformedFileKey } }";
    private static final String UPDATE_FILE_STATUS_QUERY = """
                {
                    "query": "%s",
                    "operationName": "UpdateFileStatus",
                    "variables": {
                        "input": {
                            "id": "%s",
                            "status": "%s"
                            %s
                        }
                    }
                }""";
    public static void markFileAs(String fileId, String status, String transformedFileKey) {
        LOGGER.info("Task in status {}", status);
        String graphQLMutationResponse = performGraphQLMutation(APPSYNC_ENDPOINT, UPDATE_FILE_STATUS_QUERY.formatted(UPDATE_FILE_STATUS_MUTATION, fileId, status,
                transformedFileKey != null ? ", \"transformedFileKey\": \"" + transformedFileKey + "\"" : ""));
        LOGGER.debug(graphQLMutationResponse);
    }

    private static String performGraphQLMutation(String endpoint, String jsonQuery) {
        LOGGER.debug(jsonQuery);

        String host;
        String path;
        try {
            host = new URL(endpoint).getHost();
            path = new URL(endpoint).getPath();
        } catch (MalformedURLException e) {
            throw new UpdateFileStatusException(e);
        }

        SdkHttpFullRequest request = SdkHttpFullRequest
                .builder()
                .method(SdkHttpMethod.POST)
                .putHeader("Host", host)
                .putHeader("Content-Type", "application/json")
                .host(host)
                .encodedPath(path)
                .protocol("HTTPS")
                .contentStreamProvider(() -> new ByteArrayInputStream(jsonQuery.getBytes(StandardCharsets.UTF_8)))
                .build();

        ExecutionAttributes attributes = ExecutionAttributes.builder()
                .put(AwsSignerExecutionAttribute.AWS_CREDENTIALS, credentialsProvider.resolveCredentials())
                .put(AwsSignerExecutionAttribute.SERVICE_SIGNING_NAME, "appsync")
                .put(AwsSignerExecutionAttribute.SIGNING_REGION, AWS_REGION)
                .build();

        // Perform AWS Signature Version 4 signing
        Aws4Signer signer = Aws4Signer.create();
        SdkHttpFullRequest prepRequest = signer.sign(request, attributes);

        // Perform the HTTP call to GraphQL endpoint
        HttpPost httpPost = new HttpPost(endpoint);
        for (Map.Entry<String, List<String>> header : prepRequest.headers().entrySet()) {
            if (header.getKey().equalsIgnoreCase("host")) { continue; }
            for (var value : header.getValue()) {
                httpPost.addHeader(header.getKey(), value);
            }
        }

        try (CloseableHttpClient client = HttpClients.custom().build()) {
            httpPost.setEntity(new ByteArrayEntity(jsonQuery.getBytes(StandardCharsets.UTF_8)));
            return performHttpCall(client, httpPost);
        } catch (IOException e) {
            throw new UpdateFileStatusException(e);
        }
    }

    private static String performHttpCall(CloseableHttpClient client, HttpPost httpPost) {
        try (var response = client.execute(httpPost)) {
            String responseData = new String(response.getEntity().getContent().readAllBytes(), StandardCharsets.UTF_8);
            if (responseData.contains("errors")) {
                throw new UpdateFileStatusException(responseData);
            }
            return responseData;
        } catch (IOException e) {
            throw new UpdateFileStatusException(e);
        }
    }
}
