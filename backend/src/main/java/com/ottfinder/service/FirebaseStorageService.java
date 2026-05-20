package com.ottfinder.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.auth.oauth2.GoogleCredentials;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.io.ByteArrayInputStream;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

@Service
@ConditionalOnProperty(name = "firebase.enabled", havingValue = "true")
@Slf4j
public class FirebaseStorageService {

    @Value("${firebase.credentials-path:}")
    private String credentialsPath;

    @Value("${firebase.credentials-json:}")
    private String credentialsJson;

    @Value("${firebase.storage-bucket}")
    private String storageBucket;

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    private GoogleCredentials credentials;

    public FirebaseStorageService(RestTemplate restTemplate, ObjectMapper objectMapper) {
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
    }

    @PostConstruct
    public void init() throws IOException {
        InputStream stream = credentialsJson != null && !credentialsJson.isBlank()
                ? new ByteArrayInputStream(credentialsJson.getBytes(StandardCharsets.UTF_8))
                : new FileInputStream(credentialsPath);
        credentials = GoogleCredentials.fromStream(stream)
                .createScoped(List.of("https://www.googleapis.com/auth/cloud-platform"));
        log.info("FirebaseStorageService initialized for bucket: {}", storageBucket);
    }

    @SuppressWarnings("unchecked")
    public String uploadAvatar(String userId, byte[] bytes, String contentType) {
        try {
            credentials.refreshIfExpired();
            String accessToken = credentials.getAccessToken().getTokenValue();

            String objectName = "avatars/" + userId;
            String uploadUrl = "https://firebasestorage.googleapis.com/v0/b/"
                    + URLEncoder.encode(storageBucket, StandardCharsets.UTF_8)
                    + "/o?name=" + URLEncoder.encode(objectName, StandardCharsets.UTF_8);

            HttpHeaders headers = new HttpHeaders();
            headers.set("Authorization", "Bearer " + accessToken);
            headers.setContentType(MediaType.parseMediaType(contentType));

            ResponseEntity<Map> response = restTemplate.exchange(
                    uploadUrl, HttpMethod.POST, new HttpEntity<>(bytes, headers), Map.class);

            Map<String, Object> body = response.getBody();
            if (body == null) throw new RuntimeException("Empty response from Firebase Storage");

            String downloadToken = (String) body.get("downloadTokens");
            String encodedName = URLEncoder.encode(objectName, StandardCharsets.UTF_8)
                    .replace("+", "%20");

            return "https://firebasestorage.googleapis.com/v0/b/"
                    + storageBucket + "/o/" + encodedName
                    + "?alt=media&token=" + downloadToken;

        } catch (Exception e) {
            log.error("Avatar upload failed for userId={}: {}", userId, e.getMessage());
            throw new RuntimeException("Avatar upload failed", e);
        }
    }
}
