package com.ottfinder.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Entity
@Table(name = "movie_availability")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MovieAvailability {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "movie_id", nullable = false)
    private Movie movie;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "platform_id", nullable = false)
    private OttPlatform platform;

    @Column(name = "deep_link", length = 500)
    private String deepLink;

    // NULL means expiry is unknown, not that it's permanent
    @Column(name = "available_until")
    private OffsetDateTime availableUntil;

    @Column(name = "last_verified_at")
    private OffsetDateTime lastVerifiedAt;
}
