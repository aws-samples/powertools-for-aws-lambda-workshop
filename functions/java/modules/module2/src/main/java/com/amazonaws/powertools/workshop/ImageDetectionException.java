package com.amazonaws.powertools.workshop;

public class ImageDetectionException extends Exception {
    private final String fileId;
    private final String userId;

    public ImageDetectionException(String message, ImageMetadata metadata) {
        super(message);
        this.fileId = metadata.getFileId();
        this.userId = metadata.getUserId();
    }


    public static class NoLabelsFoundException extends ImageDetectionException {
        public NoLabelsFoundException(ImageMetadata metadata) {
            super("No labels found in image", metadata);
        }
    }

    static class NoPersonFoundException extends ImageDetectionException {
        public NoPersonFoundException(ImageMetadata metadata) {
            super("No person found in image", metadata);
        }
    }
}


