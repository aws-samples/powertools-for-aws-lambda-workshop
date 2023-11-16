/*
Please NOTE: this class is commented out as there are additional dependencies that workshop attendees need to add to pom.xml

package com.amazonaws.powertools.workshop;

import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.Duration;
import java.util.Map;

import com.amazonaws.xray.AWSXRay;
import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import java.util.UUID;
import javax.imageio.ImageIO;
import net.coobird.thumbnailator.Thumbnails;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import software.amazon.cloudwatchlogs.emf.model.Unit;
import software.amazon.lambda.powertools.idempotency.Idempotency;
import software.amazon.lambda.powertools.idempotency.IdempotencyConfig;
import software.amazon.lambda.powertools.idempotency.IdempotencyKey;
import software.amazon.lambda.powertools.idempotency.Idempotent;
import software.amazon.lambda.powertools.idempotency.persistence.DynamoDBPersistenceStore;
import software.amazon.lambda.powertools.logging.Logging;
import software.amazon.lambda.powertools.logging.LoggingUtils;
import software.amazon.lambda.powertools.metrics.Metrics;
import software.amazon.lambda.powertools.metrics.MetricsUtils;
import software.amazon.lambda.powertools.tracing.Tracing;
import software.amazon.lambda.powertools.tracing.TracingUtils;

import static com.amazonaws.powertools.workshop.Utils.getImageMetadata;
import static com.amazonaws.powertools.workshop.Utils.markFileAs;
import static software.amazon.lambda.powertools.metrics.MetricsUtils.metricsLogger;


public class Module1HandlerComplete implements RequestHandler<S3EBEvent, String> {
    private static final String IDEMPOTENCY_TABLE_NAME = System.getenv("IDEMPOTENCY_TABLE_NAME");

    private static final String  TRANSFORMED_IMAGE_PREFIX = "transformed/image/jpg";
    private static final String  TRANSFORMED_IMAGE_EXTENSION = ".jpeg";
    private static final int TRANSFORMED_IMAGE_WIDTH = 720;
    private static final int TRANSFORMED_IMAGE_HEIGHT = 480;
    private static final Logger LOGGER = LogManager.getLogger(Module1Handler.class);

    public Module1HandlerComplete() {
        // Configure Idempotency module
        Idempotency.config().withConfig(
                        IdempotencyConfig.builder()
                                .withEventKeyJMESPath("[etag, userId]")
                                .withThrowOnNoIdempotencyKey(true)
                                .withExpiration(Duration.ofMinutes(120))
                                .build())
                .withPersistenceStore(
                        DynamoDBPersistenceStore.builder()
                                .withDynamoDbClient(Utils.ddbClient)
                                .withTableName(IDEMPOTENCY_TABLE_NAME)
                                .build()
                ).configure();
    }

    @Logging(logEvent = true)
    @Tracing
    @Metrics(captureColdStart = true)
    public String handleRequest(final S3EBEvent event, final Context context) {
        Idempotency.registerLambdaContext(context);

        S3Object object = new S3Object();
        object.setKey(event.getDetail().getObject().get("key"));
        object.setEtag(event.getDetail().getObject().get("etag"));

        // Fetch additional metadata from DynamoDB
        Map<String, String> metadata = getImageMetadata(object.getKey());
        object.setFileId(metadata.get("fileId"));
        object.setUserId(metadata.get("userId"));

        // add metadata to the logs
        LoggingUtils.appendKey("S3Object", object.toString());

        try {
            // Mark file as working
            markFileAs(object.getFileId(), "in-progress", null);

            String newObjectKey = processOneIdempotently(object);

            metricsLogger().putMetric("ImageProcessed", 1, Unit.COUNT);

            // Mark file as done
            markFileAs(object.getFileId(), "completed", newObjectKey);
        } catch (Exception e) {
            // Mark file as failed
            markFileAs(object.getFileId(), "failed", null);
            throw e;
        } finally {
            // remove metadata for subsequent lambda executions
            LoggingUtils.removeKey("S3Object");
        }

        return "ok";
    }

    @Tracing
    @Idempotent
    private String processOneIdempotently(@IdempotencyKey S3Object s3Object) {
        String newObjectKey = TRANSFORMED_IMAGE_PREFIX + "/" + UUID.randomUUID() + TRANSFORMED_IMAGE_EXTENSION;

        // Get the original image from S3
        byte[] originalImageBytes = Utils.getOriginalImageBytes(s3Object);
        LOGGER.info("Load image from S3: {} ({}kb)", s3Object.key, originalImageBytes.length / 1024);

        try {
            // Create thumbnail from the original image (you'll need to implement this method)
            byte[] thumbnail = createThumbnail(originalImageBytes);

            // Save the thumbnail on S3
            Utils.storeImageThumbnail(thumbnail, newObjectKey);

            // Log the result
            LOGGER.info("Saved image on S3: {} ({}kb)", newObjectKey, thumbnail.length / 1024);

            // Annotate the XRay Segment with the newObjectKey
            TracingUtils.putAnnotation("newObjectKey", newObjectKey);

            // Add metric
            metricsLogger().putMetric("ThumbnailGenerated", 1, Unit.COUNT);
        } catch (IOException e) {
            throw new RuntimeException(e);
        }

        return newObjectKey;
    }

    private byte[] createThumbnail(byte[] originalImageBytes) throws IOException {
        BufferedImage bufferedImage = Thumbnails.of(new ByteArrayInputStream(originalImageBytes))
                .size(TRANSFORMED_IMAGE_WIDTH, TRANSFORMED_IMAGE_HEIGHT)
                .outputFormat("jpg")
                .asBufferedImage();
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        ImageIO.write(bufferedImage, "jpg", baos);
        return baos.toByteArray();
    }
}
*/
