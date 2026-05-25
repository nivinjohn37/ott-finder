package com.ottfinder.service;

import com.ottfinder.entity.User;
import com.ottfinder.entity.UserBadge;
import com.ottfinder.repository.ReviewRepository;
import com.ottfinder.repository.UserBadgeRepository;
import com.ottfinder.repository.UserRepository;
import com.ottfinder.repository.WatchlistRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Service
@RequiredArgsConstructor
public class BadgeService {

    private final UserBadgeRepository badgeRepository;
    private final ReviewRepository reviewRepository;
    private final WatchlistRepository watchlistRepository;
    private final UserRepository userRepository;

    // Fires AFTER the outer transaction commits — so the review/watchlist row is
    // already visible and countByUserId returns the correct post-commit count.
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void onBadgeCheck(BadgeCheckEvent event) {
        try {
            User user = userRepository.findById(event.userId()).orElse(null);
            if (user == null) return;

            award(user, "FIRST_REVIEW",
                    reviewRepository.countByUserId(user.getId()) >= 1);

            award(user, "WATCHED_10",
                    badgeRepository.countWatchedByUserId(user.getId()) >= 10);

            award(user, "WATCHLIST_COLLECTOR",
                    watchlistRepository.countByUserId(user.getId()) >= 5);
        } catch (Exception ignored) {
            // Badge award is best-effort — never fail the primary action
        }
    }

    private void award(User user, String badgeType, boolean condition) {
        if (condition && !badgeRepository.existsByUserIdAndBadgeType(user.getId(), badgeType)) {
            badgeRepository.save(UserBadge.builder().user(user).badgeType(badgeType).build());
        }
    }
}
