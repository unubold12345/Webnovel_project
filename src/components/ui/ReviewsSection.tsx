"use client";

import { useState } from "react";
import Link from "next/link";
import ReviewCard from "./ReviewCard";
import WriteReviewModal from "./WriteReviewModal";
import styles from "./ReviewsSection.module.css";

interface Review {
  id: string;
  rating: number;
  content: string;
  isSpoiler: boolean;
  likeCount: number;
  dislikeCount: number;
  createdAt: Date;
  user: {
    id: string;
    username: string;
    avatar: string | null;
    role: string;
  };
  userLike?: { type: string } | null;
}

interface ReviewsSectionProps {
  novelId: string;
  novelSlug: string;
  novelTitle: string;
  reviews: Review[];
  totalReviews: number;
  averageRating: number;
  currentUserId?: string;
  currentUserRole?: string;
  currentUserHasReviewed: boolean;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className={styles.stars}>
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill={star <= Math.round(rating) ? "#fbbf24" : "none"}
          stroke={star <= Math.round(rating) ? "#fbbf24" : "#6b7280"}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </div>
  );
}

export default function ReviewsSection({
  novelId,
  novelSlug,
  novelTitle,
  reviews,
  totalReviews,
  averageRating,
  currentUserId,
  currentUserRole,
  currentUserHasReviewed,
}: ReviewsSectionProps) {
  const [showWriteModal, setShowWriteModal] = useState(false);
  const [localReviews, setLocalReviews] = useState(reviews);

  const isAdmin = currentUserRole === "admin" || currentUserRole === "moderator";

  const handleLike = async (reviewId: string, type: "like" | "dislike") => {
    if (!currentUserId) return;

    try {
      const res = await fetch("/api/reviews/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId, type }),
      });

      if (res.ok) {
        setLocalReviews((prev) =>
          prev.map((review) => {
            if (review.id !== reviewId) return review;

            const prevType = review.userLike?.type;
            let newLikeCount = review.likeCount;
            let newDislikeCount = review.dislikeCount;

            if (prevType === type) {
              // Remove like/dislike
              if (type === "like") newLikeCount--;
              else newDislikeCount--;
              return { ...review, likeCount: newLikeCount, dislikeCount: newDislikeCount, userLike: null };
            } else {
              // Add new like/dislike, remove old if exists
              if (prevType === "like") newLikeCount--;
              if (prevType === "dislike") newDislikeCount--;
              if (type === "like") newLikeCount++;
              else newDislikeCount++;
              return { ...review, likeCount: newLikeCount, dislikeCount: newDislikeCount, userLike: { type } };
            }
          })
        );
      }
    } catch (error) {
      console.error("Failed to like review:", error);
    }
  };

  const handleSuccess = () => {
    window.location.reload();
  };

  const handleDelete = async (reviewId: string) => {
    if (!isAdmin) return;

    try {
      const res = await fetch(`/api/reviews/${reviewId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setLocalReviews((prev) => prev.filter((review) => review.id !== reviewId));
      } else {
        let errorMessage = "Failed to delete review";
        try {
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const data = await res.json();
            errorMessage = data.error || errorMessage;
          } else {
            const text = await res.text();
            if (text) errorMessage = text;
          }
        } catch (e) {
          // Ignore JSON parsing errors
        }
        alert(errorMessage);
      }
    } catch (error) {
      console.error("Failed to delete review:", error);
      alert("Failed to delete review");
    }
  };

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <div className={styles.info}>
          <h2 className={styles.title}>
            Үнэлгээнүүд ({totalReviews})
            <span className={styles.inlineRating}>
              <StarRating rating={averageRating} />
            </span>
          </h2>
        </div>
      </div>

      {localReviews.length > 0 && (
        <div className={styles.reviewsList}>
          {localReviews.slice(0, 2).map((review, index) => (
            <div
              key={review.id}
              className={`${styles.reviewWrapper} ${
                localReviews.length > 1 && index === 1 ? styles.faded : ""
              }`}
            >
              <ReviewCard
                review={review}
                currentUserId={currentUserId}
                currentUserRole={currentUserRole}
                onLike={handleLike}
                onDelete={handleDelete}
                showReport={true}
                showLikes={true}
                showDelete={isAdmin}
              />
            </div>
          ))}
        </div>
      )}

      <div className={styles.footer}>
        <Link href={`/novels/${novelSlug}/reviews`} className={styles.seeAllLink}>
          Бүх үнэлгээг харах
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </Link>
      </div>

      {showWriteModal && (
        <WriteReviewModal
          novelId={novelId}
          novelTitle={novelTitle}
          onClose={() => setShowWriteModal(false)}
          onSuccess={handleSuccess}
        />
      )}
    </section>
  );
}
