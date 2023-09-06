package com.amazonaws.powertools.workshop;

public class S3Object {
    String key;
    String etag;
    String fileId;
    String userId;

    public String getKey() {
        return key;
    }

    public void setKey(String key) {
        this.key = key;
    }

    public String getEtag() {
        return etag;
    }

    public void setEtag(String etag) {
        this.etag = etag;
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

    @Override
    public String toString() {
        return "S3Object{" +
                "key='" + key + '\'' +
                ", etag='" + etag + '\'' +
                ", fileId='" + fileId + '\'' +
                ", userId='" + userId + '\'' +
                '}';
    }
}
