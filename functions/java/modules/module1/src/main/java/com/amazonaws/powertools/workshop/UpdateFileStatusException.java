package com.amazonaws.powertools.workshop;

public class UpdateFileStatusException extends RuntimeException {

    public UpdateFileStatusException(Throwable t) {
        super(t);
    }

    public UpdateFileStatusException(String message) {
        super(message);
    }
}
