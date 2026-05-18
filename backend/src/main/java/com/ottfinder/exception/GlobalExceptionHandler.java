package com.ottfinder.exception;

import com.ottfinder.dto.response.ApiResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

import java.util.stream.Collectors;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(MovieNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ApiResponse<?> handleMovieNotFound(MovieNotFoundException ex) {
        return ApiResponse.error("MOVIE_NOT_FOUND", ex.getMessage());
    }

    @ExceptionHandler(WatchlistLimitException.class)
    @ResponseStatus(HttpStatus.PAYMENT_REQUIRED)
    public ApiResponse<?> handleWatchlistLimit(WatchlistLimitException ex) {
        return ApiResponse.error("WATCHLIST_LIMIT_EXCEEDED", ex.getMessage());
    }

    @ExceptionHandler(ExternalApiException.class)
    @ResponseStatus(HttpStatus.BAD_GATEWAY)
    public ApiResponse<?> handleExternalApi(ExternalApiException ex) {
        log.error("External API error: {}", ex.getMessage());
        return ApiResponse.error("EXTERNAL_API_ERROR", "External service temporarily unavailable");
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public ApiResponse<?> handleDuplicate(DataIntegrityViolationException ex) {
        return ApiResponse.error("WATCHLIST_DUPLICATE", "Movie is already in your watchlist");
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ApiResponse<?>> handleResponseStatus(ResponseStatusException ex) {
        String code = ex.getStatusCode().value() == 401 ? "UNAUTHORIZED" : "REQUEST_ERROR";
        return ResponseEntity.status(ex.getStatusCode())
                .body(ApiResponse.error(code, ex.getReason()));
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ApiResponse<?> handleMissingParam(MissingServletRequestParameterException ex) {
        return ApiResponse.error("VALIDATION_ERROR", ex.getParameterName() + " parameter is required");
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ApiResponse<?> handleValidation(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .map(e -> e.getField() + ": " + e.getDefaultMessage())
                .collect(Collectors.joining(", "));
        return ApiResponse.error("VALIDATION_ERROR", message);
    }

    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public ApiResponse<?> handleGeneral(Exception ex) {
        log.error("Unhandled exception", ex);
        return ApiResponse.error("INTERNAL_ERROR", "An unexpected error occurred");
    }
}
