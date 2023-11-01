package com.amazonaws.powertools.workshop;

public class APIHost {

    private String url;

    public APIHost(String url) {
        this.url = url;
    }

    public String getUrl() {
        return url;
    }

    public void setUrl(String url) {
        this.url = url;
    }
}
