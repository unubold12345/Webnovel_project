"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { useUserProfile } from "../UserProfileContext";
import styles from "../page.module.css";

interface Review {
  id: string;
  rating: number;
  content: string;
  isSpoiler: boolean;
  likeCount: number;
  dislikeCount: number;
  createdAt: string;
  novel: {
    id: string;
    slug: string;
    title: string;
    thumbnail: string | null;
  };
  userLike: { type: string } | null;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className={styles.stars}>
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill={star <= rating ? "#fbbf24" : "none"}
          stroke={star <= rating ? "#fbbf24" : "#6b7280"}
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

function SpoilerContent({ content }: { content: string }) {
  const [revealed, setRevealed] = useState(false);

  if (revealed) {
    return <p className={styles.reviewContent}>{content}</p>;
  }

  return (
    <div className={styles.spoilerContainer}>
      <div className={styles.spoilerBlur}>
        <span className={styles.spoilerText}>Spoiler: {content}</span>
      </div>
      <div className={styles.spoilerOverlay}>
        <button onClick={() => setRevealed(true)} className={styles.spoilerButton}>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          <span>Спойлер харах</span>
        </button>
      </div>
    </div>
  );
}

export default function ReviewsPage() {
  const params = useParams();
  const { data: session } = useSession();
  const user = useUserProfile();
  const userId = params.userId as string;
  const [reviews, setReviews] = useState<Review[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const isOwner = session?.user?.id === userId;
  const isAdmin = session?.user?.role === "admin" || session?.user?.role === "moderator";

  const [reportModal, setReportModal] = useState<{ show: boolean; reviewId: string | null }>({
    show: false,
    reviewId: null,
  });
  const [reportReason, setReportReason] = useState("");
  const [reporting, setReporting] = useState(false);

  const [deleteModal, setDeleteModal] = useState<{ show: boolean; reviewId: string | null }>({
    show: false,
    reviewId: null,
  });
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchReviews();
  }, [userId]);

  useEffect(() => {
    fetchReviews();
  }, [userId, page]);

  const fetchReviews = async () => {
    const res = await fetch(`/api/users/${userId}/reviews?page=${page}`);
    if (res.ok) {
      const data = await res.json();
      setReviews(data.reviews);
      setTotalPages(data.totalPages);
      setTotalCount(data.totalCount);
    }
  };

  const handleLike = async (reviewId: string, type: "like" | "dislike") => {
    if (!session?.user?.id) return;

    const res = await fetch("/api/reviews/like", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewId, type }),
    });

    if (res.ok) {
      fetchReviews();
    }
  };

  const handleReport = async () => {
    if (!session?.user?.id || !reportModal.reviewId || !reportReason.trim()) return;

    setReporting(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewId: reportModal.reviewId,
          reason: reportReason,
          category: "review",
        }),
      });

      if (res.ok) {
        alert("Report submitted successfully");
        setReportModal({ show: false, reviewId: null });
        setReportReason("");
      } else {
        const data = await res.json();
        alert(data.error || "Failed to submit report");
      }
    } catch (error) {
      console.error("Failed to report review:", error);
      alert("Failed to submit report");
    } finally {
      setReporting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.reviewId) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/reviews/${deleteModal.reviewId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setDeleteModal({ show: false, reviewId: null });
        fetchReviews();
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
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <div className={styles.contentSection}>
        <h2 className={styles.sectionTitle}>Reviews ({totalCount})</h2>
        {reviews.length === 0 ? (
          <p className={styles.empty}>Бичсэн шүүмж болон үнэлгээ байхгүй байна.</p>
        ) : (
          <>
            <div className={styles.reviewsList}>
              {reviews.map((review) => (
                <div key={review.id} className={styles.review}>
                  <div className={styles.reviewHeader}>
                    <div className={styles.reviewNovel}>
                      {review.novel?.thumbnail && (
                        <Image
                          src={review.novel.thumbnail}
                          alt={review.novel.title}
                          width={50}
                          height={70}
                          className={styles.novelThumbnail}
                        />
                      )}
                      <div className={styles.novelInfo}>
                        <Link
                          href={`/novels/${review.novel.slug}`}
                          className={styles.novelLink}
                        >
                          {review.novel.title}
                        </Link>
                        <div className={styles.reviewRating}>
                          <StarRating rating={review.rating} />
                        </div>
                        <span className={styles.reviewDate}>
                          {new Date(review.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className={styles.reviewContentWrapper}>
                    {review.isSpoiler ? (
                      <SpoilerContent content={review.content} />
                    ) : (
                      <p className={styles.reviewContent}>{review.content}</p>
                    )}
                  </div>

                  <div className={styles.reviewFooter}>
                    <div className={styles.likeButtons}>
                      <button
                        className={`${styles.likeButton} ${
                          review.userLike?.type === "like" ? styles.active : ""
                        }`}
                        onClick={() => handleLike(review.id, "like")}
                        disabled={!session?.user?.id || isOwner}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill={review.userLike?.type === "like" ? "currentColor" : "none"}
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                        </svg>
                        {review.likeCount}
                      </button>
                      <button
                        className={`${styles.likeButton} ${
                          review.userLike?.type === "dislike" ? styles.active : ""
                        }`}
                        onClick={() => handleLike(review.id, "dislike")}
                        disabled={!session?.user?.id || isOwner}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill={review.userLike?.type === "dislike" ? "currentColor" : "none"}
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zM7-13h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3" />
                        </svg>
                        {review.dislikeCount}
                      </button>
                    </div>

                    {session?.user?.id && !isOwner && !isAdmin && (
                      <button
                        className={styles.reportButton}
                        onClick={() => setReportModal({ show: true, reviewId: review.id })}
                        disabled={reporting}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                          <line x1="12" y1="9" x2="12" y2="13" />
                          <line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                        Report
                      </button>
                    )}

                    {isAdmin && (
                      <button
                        className={styles.deleteButton}
                        onClick={() => setDeleteModal({ show: true, reviewId: review.id })}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className={styles.pagination}>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className={styles.pageButton}
                >
                  Previous
                </button>
                <span className={styles.pageInfo}>
                  Page {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className={styles.pageButton}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {reportModal.show && (
        <div className={styles.modalOverlay} onClick={() => { setReportModal({ show: false, reviewId: null }); setReportReason(""); }}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Report Review</h3>
              <button onClick={() => { setReportModal({ show: false, reviewId: null }); setReportReason(""); }} className={styles.modalClose}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className={styles.modalBody}>
              <label className={styles.modalLabel}>Reason for reporting</label>
              <textarea
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder="Please describe why you are reporting this review..."
                className={styles.modalTextarea}
                autoFocus
              />
            </div>
            <div className={styles.modalFooter}>
              <button onClick={() => { setReportModal({ show: false, reviewId: null }); setReportReason(""); }} className={styles.modalCancelButton}>
                Cancel
              </button>
              <button onClick={handleReport} className={styles.modalReportButton} disabled={!reportReason.trim() || reporting}>
                {reporting ? "Submitting..." : "Submit Report"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteModal.show && (
        <div className={styles.modalOverlay} onClick={() => setDeleteModal({ show: false, reviewId: null })}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Delete Review</h3>
              <button onClick={() => setDeleteModal({ show: false, reviewId: null })} className={styles.modalClose}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className={styles.modalBody}>
              <p className={styles.modalText}>Are you sure you want to delete this review? This action cannot be undone.</p>
            </div>
            <div className={styles.modalFooter}>
              <button onClick={() => setDeleteModal({ show: false, reviewId: null })} className={styles.modalCancelButton}>
                Cancel
              </button>
              <button onClick={handleDelete} className={styles.modalDeleteButton} disabled={deleting}>
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}