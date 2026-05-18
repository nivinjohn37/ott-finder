package com.ottfinder.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;

import java.io.ByteArrayInputStream;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

@Configuration
@ConditionalOnProperty(name = "firebase.enabled", havingValue = "true")
@Slf4j
public class FirebaseConfig {

    @Value("${firebase.credentials-path:}")
    private String credentialsPath;

    // Set FIREBASE_CREDENTIALS_JSON env var on Railway (paste the full JSON content)
    @Value("${firebase.credentials-json:}")
    private String credentialsJson;

    @PostConstruct
    public void initialize() throws IOException {
        if (!FirebaseApp.getApps().isEmpty()) {
            return;
        }
        try (InputStream stream = resolveCredentials()) {
            FirebaseOptions options = FirebaseOptions.builder()
                    .setCredentials(GoogleCredentials.fromStream(stream))
                    .build();
            FirebaseApp.initializeApp(options);
            log.info("Firebase initialized successfully");
        }
    }

    private InputStream resolveCredentials() throws IOException {
        // Prefer inline JSON (Railway env var) over file path (local dev)
        if (credentialsJson != null && !credentialsJson.isBlank()) {
            log.info("Loading Firebase credentials from environment variable");
            return new ByteArrayInputStream(credentialsJson.getBytes(StandardCharsets.UTF_8));
        }
        log.info("Loading Firebase credentials from file: {}", credentialsPath);
        return new FileInputStream(credentialsPath);
    }
}
