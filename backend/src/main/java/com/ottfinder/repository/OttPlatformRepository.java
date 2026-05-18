package com.ottfinder.repository;

import com.ottfinder.entity.OttPlatform;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface OttPlatformRepository extends JpaRepository<OttPlatform, Long> {
    Optional<OttPlatform> findByName(String name);
    Optional<OttPlatform> findByJustwatchProviderId(Integer justwatchProviderId);
}
