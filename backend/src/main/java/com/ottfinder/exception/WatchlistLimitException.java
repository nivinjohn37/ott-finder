package com.ottfinder.exception;

public class WatchlistLimitException extends RuntimeException {
    public WatchlistLimitException() {
        super("You've reached the 5-item watchlist limit. Remove a title to add more.");
    }
}
