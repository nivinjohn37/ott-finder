package com.ottfinder.repository;

import com.ottfinder.entity.WatchGroup;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface WatchGroupRepository extends JpaRepository<WatchGroup, Long> {

    Optional<WatchGroup> findByInviteCode(String inviteCode);

    boolean existsByInviteCode(String inviteCode);

    @Query("""
            SELECT g FROM WatchGroup g
            WHERE g.id IN (
                SELECT gm.group.id FROM GroupMember gm WHERE gm.user.id = :userId
            )
            ORDER BY g.createdAt DESC
            """)
    List<WatchGroup> findGroupsByUserId(@Param("userId") Long userId);
}
