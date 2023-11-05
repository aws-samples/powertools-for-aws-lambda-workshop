package com.amazonaws.powertools.workshop;

import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Map;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import java.util.UUID;
import javax.imageio.ImageIO;
import net.coobird.thumbnailator.Thumbnails;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import static com.amazonaws.powertools.workshop.Utils.getImageMetadata;
import static com.amazonaws.powertools.workshop.Utils.markFileAs;


/**
 * Handler for requests to Lambda function.
 */
public class Module1Handler implements RequestHandler<S3EBEvent, String> {

    private static final String  TRANSFORMED_IMAGE_PREFIX = "transformed/image/jpg";
    private static final String  TRANSFORMED_IMAGE_EXTENSION = ".jpeg";
    private static final int TRANSFORMED_IMAGE_WIDTH = 720;
    private static final int TRANSFORMED_IMAGE_HEIGHT = 480;
    private static final Logger LOGGER = LogManager.getLogger(Module1Handler.class);

    public String handleRequest(final S3EBEvent event, final Context context) {

        S3Object object = new S3Object();
        object.setKey(event.getDetail().getObject().get("key"));
        object.setEtag(event.getDetail().getObject().get("etag"));

        // Fetch additional metadata from DynamoDB
        Map<String, String> metadata = getImageMetadata(object.getKey());
        object.setFileId(metadata.get("fileId"));
        object.setUserId(metadata.get("userId"));

        try {
            // Mark file as working
            markFileAs(object.getFileId(), "in-progress", null);

            String newObjectKey = processOne(object);

            // Mark file as done
            markFileAs(object.getFileId(), "completed", newObjectKey);
        } catch (Exception e) {
            // Mark file as failed
            markFileAs(object.getFileId(), "failed", null);
            throw e;
        }

        return "ok";
    }

    private String processOne(S3Object s3Object) {
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