package com.ottfinder.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;

@Entity
@Table(name = "group_suggestions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GroupSuggestion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id", nullable = false)
    private WatchGroup group;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "movie_id", nullable = false)
    private Movie movie;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "suggested_by", nullable = false)
    private User suggestedBy;

    @Column(nullable = false)
    @Builder.Default
    private int upvotes = 0;

    @Column(nullable = false)
    @Builder.Default
    private int downvotes = 0;

    @CreationTimestamp
    @Column(name = "suggested_at", updatable = false)
    private OffsetDateTime suggestedAt;
}
