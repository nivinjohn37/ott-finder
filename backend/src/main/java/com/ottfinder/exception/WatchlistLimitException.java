package com.ottfinder.exception;

public class WatchlistLimitException extends RuntimeException {
    public WatchlistLimitException() {
        super("Free tier watchlist limit reached (max 3 items). Upgrade to premium for unlimited watchlist.");
    }
}
