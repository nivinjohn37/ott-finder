package com.ottfinder.exception;

public class ExternalApiException extends RuntimeException {
    public ExternalApiException(String api, String message) {
        super(api + " API error: " + message);
    }

    public ExternalApiException(String api, Throwable cause) {
        super(api + " API error: " + cause.getMessage(), cause);
    }
}
