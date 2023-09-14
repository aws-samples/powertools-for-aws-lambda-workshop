package com.amazonaws.powertools.workshop;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.Date;
import java.util.List;
import java.util.Map;

/**
 * {@link com.amazonaws.services.lambda.runtime.events.ScheduledEvent} detail is just a HashMap, replacing with a typed event
 */
public class S3EBEvent {
    private String account;

    private String region;

    private S3EBEventDetail detail;

    private String detailType;

    private String source;

    private String id;

    private Date time;

    private List<String> resources;

    public S3EBEvent() {}

    public String getAccount() {
        return account;
    }

    public void setAccount(String account) {
        this.account = account;
    }

    public String getRegion() {
        return region;
    }

    public void setRegion(String region) {
        this.region = region;
    }

    public S3EBEventDetail getDetail() {
        return detail;
    }

    public void setDetail(S3EBEventDetail detail) {
        this.detail = detail;
    }

    public String getDetailType() {
        return detailType;
    }

    public void setDetailType(String detailType) {
        this.detailType = detailType;
    }

    public String getSource() {
        return source;
    }

    public void setSource(String source) {
        this.source = source;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public Date getTime() {
        return time;
    }

    public void setTime(Date time) {
        this.time = time;
    }

    public List<String> getResources() {
        return resources;
    }

    public void setResources(List<String> resources) {
        this.resources = resources;
    }

    public static class S3EBEventDetail {
        private String version;
        private Map<String, String> bucket;
        private Map<String, String> object;

        @JsonProperty("request-id")
        private String requestId;
        private String requester;

        @JsonProperty("source-ip-address")
        private String sourceIpAddress;
        private String reason;

        public S3EBEventDetail() {}

        public String getVersion() {
            return version;
        }

        public void setVersion(String version) {
            this.version = version;
        }

        public Map<String, String> getBucket() {
            return bucket;
        }

        public void setBucket(Map<String, String> bucket) {
            this.bucket = bucket;
        }

        public Map<String, String> getObject() {
            return object;
        }

        public void setObject(Map<String, String> object) {
            this.object = object;
        }

        public String getRequestId() {
            return requestId;
        }

        public void setRequestId(String requestId) {
            this.requestId = requestId;
        }

        public String getRequester() {
            return requester;
        }

        public void setRequester(String requester) {
            this.requester = requester;
        }

        public String getSourceIpAddress() {
            return sourceIpAddress;
        }

        public void setSourceIpAddress(String sourceIpAddress) {
            this.sourceIpAddress = sourceIpAddress;
        }

        public String getReason() {
            return reason;
        }

        public void setReason(String reason) {
            this.reason = reason;
        }
    }

}
