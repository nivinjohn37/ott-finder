package com.ottfinder.repository;

import com.ottfinder.entity.UserPreference;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface UserPreferenceRepository extends JpaRepository<UserPreference, Long> {
    List<UserPreference> findByUserId(Long userId);
    List<UserPreference> findByUserIdAndPreferenceType(Long userId, String preferenceType);
    void deleteByUserId(Long userId);
}
