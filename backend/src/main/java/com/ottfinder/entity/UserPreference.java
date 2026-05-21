package com.ottfinder.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "user_preferences",
        uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "preference_type", "value"}))
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserPreference {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "preference_type", nullable = false, length = 20)
    private String preferenceType;

    @Column(nullable = false, length = 100)
    private String value;
}
