"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { useUserProfile } from "../UserProfileContext";
import styles from "../page.module.css";

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  likeCount: number;
  dislikeCount: number;
  deletedAt: string | null;
  deletedReason: string | null;
  isSpoiler: boolean;
  showRemovedBadge: boolean;
  novel: {
    id: string;
    slug: string;
    title: string;
    thumbnail: string | null;
  } | null;
  chapter: {
    id: string;
    chapterNumber: number;
    title: string;
  } | null;
  parent: {
    user: {
      id: string;
      username: string;
    };
    content: string;
    deletedAt: string | null;
    isSpoiler: boolean;
  } | null;
}

export default function CommentsPage() {
  const params = useParams();
  const { data: session } = useSession();
  const user = useUserProfile();
  const userId = params.userId as string;
  const [comments, setComments] = useState<Comment[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [revealedSpoilers, setRevealedSpoilers] = useState<Set<string>>(new Set());
  const isOwner = session?.user?.id === userId;

  useEffect(() => {
    fetchComments();
  }, [userId]);

  useEffect(() => {
    fetchComments();
  }, [userId, page]);

  const fetchComments = async () => {
    const res = await fetch(`/api/users/${userId}/comments?page=${page}`);
    if (res.ok) {
      const data = await res.json();
      setComments(data.comments);
      setTotalPages(data.totalPages);
      setTotalCount(data.totalCount);
    }
  };

  const toggleRevealSpoiler = (commentId: string) => {
    setRevealedSpoilers((prev) => {
      const next = new Set(prev);
      if (next.has(commentId)) {
        next.delete(commentId);
      } else {
        next.add(commentId);
      }
      return next;
    });
  };

  return (
    <div className={styles.contentSection}>
      <h2 className={styles.sectionTitle}>Сэтгэгдлүүд ({totalCount})</h2>
      {comments.length === 0 ? (
        <p className={styles.empty}>Сэтгэгдэл байхгүй</p>
      ) : (
        <>
          <div className={styles.commentsList}>
            {comments.map((comment) => (
              <div key={comment.id} className={styles.comment}>
                <div className={styles.commentHeader}>
                  <div className={styles.commentNovel}>
                    {comment.novel?.thumbnail && (
                      <Image
                        src={comment.novel.thumbnail}
                        alt={comment.novel.title}
                        width={40}
                        height={56}
                        className={styles.novelThumbnail}
                      />
                    )}
                    <div className={styles.novelInfo}>
                      <div className={styles.novelTitleRow}>
                        {comment.chapter ? (
                          <Link
                            href={`/novels/${comment.novel?.slug}/chapters/${comment.chapter.chapterNumber}`}
                            className={styles.commentLink}
                          >
                            {comment.novel?.title} - Chapter {comment.chapter.chapterNumber}: {comment.chapter.title}
                          </Link>
                        ) : comment.novel ? (
                          <Link
                            href={`/novels/${comment.novel.slug}`}
                            className={styles.commentLink}
                          >
                            {comment.novel.title}
                          </Link>
                        ) : null}
                      </div>
                      <span className={styles.commentDate}>
                        {new Date(comment.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                {comment.deletedAt && !isOwner && session?.user?.role !== "admin" && session?.user?.role !== "moderator" ? (
                  <div className={styles.removedByMod}>
                    <span>Removed by moderator</span>
                  </div>
                ) : (
                  <>
                    {comment.isSpoiler && !revealedSpoilers.has(comment.id) ? (
                      <div className={styles.spoilerContainer}>
                        <div className={styles.spoilerBlur}>
                          <p className={styles.spoilerText}>{comment.content}</p>
                        </div>
                        <div className={styles.spoilerOverlay}>
                          <button
                            onClick={() => toggleRevealSpoiler(comment.id)}
                            className={styles.spoilerButton}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                              <circle cx="12" cy="12" r="3"/>
                            </svg>
                            <span>Спойлер харах</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className={styles.commentContent}>{comment.content}</p>
                    )}
                    {isOwner && comment.showRemovedBadge && (
                      <div className={styles.removedBadge}>
                        <span>Your comment was removed by moderator</span>
                        {comment.deletedReason && <span className={styles.removedReason}>Reason: {comment.deletedReason}</span>}
                      </div>
                    )}
                    {comment.deletedAt && (session?.user?.role === "admin" || session?.user?.role === "moderator") && (
                      <span className={styles.removedBadgeSmall}>Removed by moderator</span>
                    )}
                  </>
                )}
                {comment.parent && (
                  <div className={styles.replyInfo}>
                    <div className={styles.replyInfoUser}>@{comment.parent.user.username} wrote:</div>
                    {comment.parent.deletedAt && session?.user?.role !== "admin" && session?.user?.role !== "moderator" ? (
                      <p className={styles.parentContent}>Removed by moderator</p>
                    ) : comment.parent.deletedAt ? (
                      <div className={styles.removedComment}>
                        <p className={styles.parentContent}>{comment.parent.content}</p>
                        <span className={styles.removedBadgeSmall}>Removed by moderator</span>
                      </div>
                    ) : comment.parent.isSpoiler && !revealedSpoilers.has(`parent-${comment.id}`) ? (
                      <div className={styles.spoilerContainer}>
                        <div className={styles.spoilerBlur}>
                          <p className={styles.spoilerText}>{comment.parent.content}</p>
                        </div>
                        <div className={styles.spoilerOverlay}>
                          <button
                            onClick={() => toggleRevealSpoiler(`parent-${comment.id}`)}
                            className={styles.spoilerButton}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                              <circle cx="12" cy="12" r="3"/>
                            </svg>
                            <span>Спойлер харах</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className={styles.parentContent}>{comment.parent.content}</p>
                    )}
                  </div>
                )}
                <div className={styles.commentFooter}>
                  <div className={styles.voteButtons}>
                    <span className={styles.likeCount}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M7 10v12" />
                        <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z" />
                      </svg>
                      {comment.likeCount}
                    </span>
                    <span className={styles.dislikeCount}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 14V2" />
                        <path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22h0a3.13 3.13 0 0 1-3-3.88Z" />
                      </svg>
                      {comment.dislikeCount}
                    </span>
                  </div>
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
  );
}