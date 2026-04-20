"use client";

import { useState } from "react";
import Image from "next/image";
import styles from "./ReviewCard.module.css";
import { Toast, useToast } from "./Toast";

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

interface ReviewCardProps {
  review: Review;
  currentUserId?: string;
  currentUserRole?: string;
  onLike: (reviewId: string, type: "like" | "dislike") => void;
  onDelete?: (reviewId: string) => void;
  showReport?: boolean;
  showLikes?: boolean;
  showDelete?: boolean;
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "саяхан";
  if (diffMins < 60) return `${diffMins} минутын өмнө`;
  if (diffHours < 24) return `${diffHours} цагийн өмнө`;
  if (diffDays < 7) return `${diffDays} хоногийн өмнө`;
  return new Date(date).toLocaleDateString();
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
          fill={star <= rating ? "#fbbf24" : "none"}
          stroke={star <= rating ? "#fbbf24" : "#6b7280"}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
      <span className={styles.ratingNumber}>({rating})</span>
    </div>
  );
}

export default function ReviewCard({
  review,
  currentUserId,
  currentUserRole,
  onLike,
  onDelete,
  showReport = false,
  showLikes = false,
  showDelete = false
}: ReviewCardProps) {
  const [reporting, setReporting] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportError, setReportError] = useState("");
  const { toasts, addToast, removeToast } = useToast();

  const isAdmin = currentUserRole === "admin" || currentUserRole === "moderator";
  const isOwner = currentUserId === review.user.id;

  const handleReportSubmit = async () => {
    if (!currentUserId || !reportReason.trim()) return;

    // Check if trying to report own review
    if (isOwner) {
      setReportError("Өөрийн шүүмжлэлийг репорт хийх боломжгүй");
      return;
    }

    setReporting(true);
    setReportError("");
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: "review",
          reason: reportReason,
          reviewId: review.id,
        }),
      });

      if (res.ok) {
        addToast("Мэдэгдэл амжилттай илгээгдлээ!", "success", 5000);
        setShowReportModal(false);
        setReportReason("");
      } else {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await res.json();
          setReportError(data.error || "Мэдэгдэл илгээхэд алдаа гарлаа");
        } else {
          setReportError("Мэдэгдэл илгээхэд алдаа гарлаа");
        }
      }
    } catch (error) {
      console.error("Failed to report review:", error);
      setReportError("Мэдэгдэл илгээхэд алдаа гарлаа");
    } finally {
      setReporting(false);
    }
  };

  const handleDeleteClick = () => {
    if (onDelete && confirm("Энэ шүүмжлэлийг устгахдаа итгэлтэй байна уу?")) {
      onDelete(review.id);
    }
  };

  return (
    <>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.userInfo}>
            <div className={styles.avatar}>
              {review.user.avatar ? (
                <Image
                  src={review.user.avatar}
                  alt={review.user.username}
                  width={40}
                  height={40}
                  className={styles.avatarImage}
                />
              ) : (
                <div className={styles.avatarPlaceholder}>
                  {review.user.username.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className={styles.userMeta}>
              <span className={styles.username}>{review.user.username}</span>
              <span className={styles.userRole}>УНШИГЧ</span>
            </div>
          </div>
          <span className={styles.timeAgo}>{formatTimeAgo(review.createdAt)}</span>
        </div>

        <div className={styles.rating}>
          <StarRating rating={review.rating} />
        </div>

        <div className={styles.content}>
          {review.isSpoiler ? (
            <SpoilerContent content={review.content} />
          ) : (
            <p>{review.content}</p>
          )}
        </div>

        <div className={styles.actions}>
          {/* Report button - only for normal users (not admin, not owner) */}
          {showReport && currentUserId && !isAdmin && !isOwner && (
            <button
              className={styles.reportButton}
              onClick={() => setShowReportModal(true)}
              disabled={reporting}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
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
              Мэдэгдэх
            </button>
          )}

          {/* Delete button - for admins */}
          {showDelete && isAdmin && (
            <button
              className={styles.deleteButton}
              onClick={handleDeleteClick}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
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
              Устгах
            </button>
          )}

          {showLikes && (
            <div className={styles.likeButtons}>
              <button
                className={`${styles.likeButton} ${
                  review.userLike?.type === "like" ? styles.active : ""
                }`}
                onClick={() => onLike(review.id, "like")}
                disabled={!currentUserId}
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
                onClick={() => onLike(review.id, "dislike")}
                disabled={!currentUserId}
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
                  <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3" />
                </svg>
                {review.dislikeCount}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Report Modal */}
      {showReportModal && (
        <div className={styles.modalOverlay} onClick={() => { setShowReportModal(false); setReportReason(""); setReportError(""); }}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Шүүмжлэл мэдэгдэх</h3>
              <button onClick={() => { setShowReportModal(false); setReportReason(""); setReportError(""); }} className={styles.modalClose}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className={styles.modalBody}>
              {isOwner && (
                <div className={styles.selfReportWarning}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <span>Өөрийн шүүмжлэлийг репорт хийх боломжгүй</span>
                </div>
              )}
              {reportError && (
                <div className={styles.reportError}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                  </svg>
                  <span>{reportError}</span>
                </div>
              )}
              <label className={styles.modalLabel}>Мэдэгдэх шалтгаан</label>
              <textarea
                value={reportReason}
                onChange={(e) => { setReportReason(e.target.value); setReportError(""); }}
                placeholder="Яагаад энэ шүүмжлэлийг мэдэгдэж байгаагаа бичнэ үү..."
                className={styles.modalTextarea}
                autoFocus
                disabled={isOwner}
              />
            </div>
            <div className={styles.modalFooter}>
              <button onClick={() => { setShowReportModal(false); setReportReason(""); setReportError(""); }} className={styles.modalCancelButton}>
                Цуцлах
              </button>
              <button onClick={handleReportSubmit} className={styles.modalReportButton} disabled={!reportReason.trim() || reporting || isOwner}>
                {reporting ? "Илгээж байна..." : "Мэдэгдэх"}
              </button>
            </div>
          </div>
        </div>
      )}
      <Toast toasts={toasts} onRemove={removeToast} />
    </>
  );
}

function SpoilerContent({ content }: { content: string }) {
  const [revealed, setRevealed] = useState(false);

  if (revealed) {
    return <p>{content}</p>;
  }

  return (
    <div className={styles.spoilerContainer}>
      <div className={styles.spoilerBlur}>
        <p className={styles.spoilerText}>{content}</p>
      </div>
      <div className={styles.spoilerOverlay}>
        <button
          onClick={() => setRevealed(true)}
          className={styles.spoilerButton}
        >
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
