package com.amazonaws.powertools.workshop;

public class ImageMetadata {
    private String fileId;
    private String userId;

    public ImageMetadata(String fileId, String userId) {
        this.fileId = fileId;
        this.userId = userId;
    }

    public static ImageMetadata of(String fileId, String userId) {
        return new ImageMetadata(fileId, userId);
    }

    public String getFileId() {
        return fileId;
    }

    public void setFileId(String fileId) {
        this.fileId = fileId;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }
}
