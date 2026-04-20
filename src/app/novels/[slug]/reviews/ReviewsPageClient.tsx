"use client";

import { useState } from "react";
import ReviewCard from "@/components/ui/ReviewCard";
import WriteReviewModal from "@/components/ui/WriteReviewModal";
import styles from "./ReviewsPageClient.module.css";

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

interface ReviewsPageClientProps {
  novelId: string;
  novelSlug: string;
  novelTitle: string;
  initialReviews: Review[];
  totalReviews: number;
  averageRating: number;
  currentUserId?: string;
  currentUserRole?: string;
  currentUserHasReviewed: boolean;
}

type SortOption = "newest" | "mostLiked" | "oldest";

function StarRating({ rating }: { rating: number }) {
  return (
    <div className={styles.stars}>
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
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

export default function ReviewsPageClient({
  novelId,
  novelSlug,
  novelTitle,
  initialReviews,
  totalReviews,
  averageRating,
  currentUserId,
  currentUserRole,
  currentUserHasReviewed,
}: ReviewsPageClientProps) {
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [showWriteModal, setShowWriteModal] = useState(false);

  const isAdmin = currentUserRole === "admin" || currentUserRole === "moderator";

  const sortedReviews = [...reviews].sort((a, b) => {
    switch (sortBy) {
      case "mostLiked":
        return b.likeCount - a.likeCount;
      case "oldest":
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case "newest":
      default:
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  const handleLike = async (reviewId: string, type: "like" | "dislike") => {
    if (!currentUserId) return;

    try {
      const res = await fetch("/api/reviews/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId, type }),
      });

      if (res.ok) {
        setReviews((prev) =>
          prev.map((review) => {
            if (review.id !== reviewId) return review;

            const prevType = review.userLike?.type;
            let newLikeCount = review.likeCount;
            let newDislikeCount = review.dislikeCount;

            if (prevType === type) {
              if (type === "like") newLikeCount--;
              else newDislikeCount--;
              return { ...review, likeCount: newLikeCount, dislikeCount: newDislikeCount, userLike: null };
            } else {
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

  const handleDelete = async (reviewId: string) => {
    if (!isAdmin) return;

    try {
      console.log("Deleting review:", reviewId);
      const res = await fetch(`/api/reviews/${reviewId}`, {
        method: "DELETE",
      });
      
      console.log("Delete response status:", res.status);
      console.log("Delete response headers:", res.headers.get("content-type"));

      if (res.ok) {
        setReviews((prev) => prev.filter((review) => review.id !== reviewId));
      } else {
        let errorMessage = "Failed to delete review";
        try {
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const data = await res.json();
            errorMessage = data.error || errorMessage;
          } else {
            const text = await res.text();
            console.log("Error response text:", text);
            if (text) errorMessage = text;
          }
        } catch (e) {
          console.error("Error parsing error response:", e);
        }
        alert(errorMessage);
      }
    } catch (error) {
      console.error("Failed to delete review:", error);
      alert("Failed to delete review");
    }
  };

  const handleSuccess = () => {
    window.location.reload();
  };

  return (
    <>
      {/* Stats and Write Button */}
      <div className={styles.statsRow}>
        <div className={styles.ratingSummary}>
          <span className={styles.totalCount}>{totalReviews} шүүмжлэл</span>
          <StarRating rating={averageRating} />
          <span className={styles.averageRating}>{averageRating.toFixed(1)}</span>
        </div>
        {!currentUserHasReviewed && currentUserId && (
          <button
            className={styles.writeButton}
            onClick={() => setShowWriteModal(true)}
          >
            Шүүмж бичих
          </button>
        )}
      </div>

      {/* Sort Tabs */}
      <div className={styles.sortTabs}>
        <button
          className={`${styles.sortTab} ${sortBy === "newest" ? styles.active : ""}`}
          onClick={() => setSortBy("newest")}
        >
          Шинэ
        </button>
        <button
          className={`${styles.sortTab} ${sortBy === "mostLiked" ? styles.active : ""}`}
          onClick={() => setSortBy("mostLiked")}
        >
          Их таалагдсан
        </button>
        <button
          className={`${styles.sortTab} ${sortBy === "oldest" ? styles.active : ""}`}
          onClick={() => setSortBy("oldest")}
        >
          Хуучин
        </button>
      </div>

      {/* Reviews List */}
      <div className={styles.reviewsList}>
        {sortedReviews.length > 0 ? (
          sortedReviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              currentUserId={currentUserId}
              currentUserRole={currentUserRole}
              onLike={handleLike}
              onDelete={handleDelete}
              showReport={true}
              showLikes={true}
              showDelete={isAdmin}
            />
          ))
        ) : (
          <div className={styles.empty}>
            <p>Одоогоор шүүмжлэл алга. Эхний шүүмжлэл бичиж байгаарай!</p>
          </div>
        )}
      </div>

      {showWriteModal && (
        <WriteReviewModal
          novelId={novelId}
          novelTitle={novelTitle}
          onClose={() => setShowWriteModal(false)}
          onSuccess={handleSuccess}
        />
      )}
    </>
  );
}
