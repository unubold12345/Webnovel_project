"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import styles from "./CommentSection.module.css";
import { Toast, useToast } from "./Toast";

interface Reply {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  likeCount: number;
  dislikeCount: number;
  parentId: string | null;
  deletedAt: string | null;
  deletedReason: string | null;
  deletedByOwner: boolean;
  recoverableUntil: string | null;
  isSpoiler: boolean;
  isPinned: boolean;
  user: {
    id: string;
    username: string;
    avatar: string | null;
    role: string;
  };
  parent?: {
    user: {
      id: string;
      username: string;
      role: string;
    };
  } | null;
  replies: Reply[];
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  likeCount: number;
  dislikeCount: number;
  deletedAt: string | null;
  deletedReason: string | null;
  deletedByOwner: boolean;
  recoverableUntil: string | null;
  isSpoiler: boolean;
  isPinned: boolean;
  user: {
    id: string;
    username: string;
    avatar: string | null;
    role: string;
  };
  replies: Reply[];
}

interface CommentSectionProps {
  novelId?: string;
  chapterId?: string;
  volumeId?: string;
}

export default function CommentSection({ novelId, chapterId, volumeId }: CommentSectionProps) {
  const { data: session } = useSession();
  const navigatePathname = usePathname();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{ id: string; username: string } | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const [scrollTarget, setScrollTarget] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ show: boolean; commentId: string | null; isSoftDeleted?: boolean; hardDelete?: boolean; isOwnerDelete?: boolean }>({ show: false, commentId: null });
  const [deleteReason, setDeleteReason] = useState("");
  const [reportModal, setReportModal] = useState<{ show: boolean; commentId: string | null; ownerId?: string | null }>({ show: false, commentId: null, ownerId: null });
  const [reportReason, setReportReason] = useState("");
  const [reportError, setReportError] = useState("");
  const { toasts, addToast, removeToast } = useToast();
  const [isSpoiler, setIsSpoiler] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [revealedSpoilers, setRevealedSpoilers] = useState<Set<string>>(new Set());
  const [threeDotMenu, setThreeDotMenu] = useState<string | null>(null);
  const [editModal, setEditModal] = useState<{ show: boolean; commentId: string | null }>({ show: false, commentId: null });
  const [editContent, setEditContent] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  const getProfileUrl = (userId: string) => {
    return session?.user?.id === userId ? `/user/${session.user.id}` : `/user/${userId}`;
  };

  const findParentOfReply = (commentList: Comment[], replyId: string): string | null => {
    for (const c of commentList) {
      for (const r of c.replies) {
        if (r.id === replyId) return c.id;
      }
    }
    return null;
  };

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (isVisible) fetchComments(1);
  }, [novelId, chapterId, volumeId, isVisible]);

  const checkHash = useCallback(() => {
    const hash = window.location.hash;
    if (hash && hash.startsWith("#comment-")) {
      setScrollTarget(hash.substring(1));
    }
  }, []);

  useEffect(() => {
    checkHash();
    window.addEventListener("hashchange", checkHash);
    return () => window.removeEventListener("hashchange", checkHash);
  }, [checkHash]);

  useEffect(() => {
    checkHash();
  }, [navigatePathname, checkHash]);

  useEffect(() => {
    if (!scrollTarget || comments.length === 0) return;

    const actualId = scrollTarget.replace(/^comment-/, "");

    const commentExists = (commentList: Comment[], id: string): boolean => {
      for (const c of commentList) {
        if (c.id === id) return true;
        for (const r of c.replies) {
          if (r.id === id) return true;
        }
      }
      return false;
    };

    if (!commentExists(comments, actualId) && currentPage < totalPages) {
      loadMoreComments();
      return;
    }

    const parentId = findParentOfReply(comments, actualId);

    if (parentId && !expandedReplies.has(parentId)) {
      setExpandedReplies((prev) => new Set(prev).add(parentId));
    }
  }, [scrollTarget, comments, expandedReplies, currentPage, totalPages]);

  useEffect(() => {
    if (!scrollTarget) return;

    const element = document.getElementById(scrollTarget);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      element.classList.add(styles.highlighted);
      const target = scrollTarget;
      setTimeout(() => {
        element.classList.remove(styles.highlighted);
        if (window.location.hash === `#${target}`) {
          history.replaceState(null, "", window.location.pathname);
        }
        setScrollTarget(null);
      }, 2000);
    }
  });

  useEffect(() => {
    const handleClickOutside = () => setThreeDotMenu(null);
    if (threeDotMenu) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [threeDotMenu]);

  const fetchComments = async (page: number = 1) => {
    const params = new URLSearchParams();
    if (novelId) params.append("novelId", novelId);
    if (chapterId) params.append("chapterId", chapterId);
    if (volumeId) params.append("volumeId", volumeId);
    params.append("page", page.toString());

    if (page === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    const res = await fetch(`/api/comments?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      if (page === 1) {
        setComments(data.comments);
      } else {
        setComments((prev) => {
          const existingIds = new Set(prev.map(c => c.id));
          const newComments = data.comments.filter((c: Comment) => !existingIds.has(c.id));
          return [...prev, ...newComments];
        });
      }
      setTotalPages(data.totalPages);
      setCurrentPage(data.currentPage);
      setTotalCount(data.totalCount || 0);
      setIsAdmin(data.isAdmin || false);
    }
    setLoading(false);
    setLoadingMore(false);
  };

  const loadMoreComments = () => {
    if (currentPage < totalPages) {
      fetchComments(currentPage + 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || loading) return;

    setLoading(true);
    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ novelId, chapterId, volumeId, content: newComment, isSpoiler, isPinned }),
    });

    if (res.ok) {
      setNewComment("");
      setIsSpoiler(false);
      setIsPinned(false);
      fetchComments();
    }
    setLoading(false);
  };

  const handleReply = async () => {
    if (!replyContent.trim() || loading || !replyingTo) return;

    setLoading(true);
    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ novelId, chapterId, volumeId, content: replyContent, parentId: replyingTo.id, isSpoiler }),
    });

    if (res.ok) {
      setReplyContent("");
      setReplyingTo(null);
      setIsSpoiler(false);
      fetchComments();
    }
    setLoading(false);
  };

  const handleLikeDislike = async (commentId: string, type: "like" | "dislike") => {
    const res = await fetch(`/api/comments/${commentId}/like`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commentId, type }),
    });

    if (res.ok) {
      const data = await res.json();
      setComments((prev) => updateCommentCounts(prev, commentId, data.likeCount, data.dislikeCount));
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.commentId) return;

    const hardDelete = deleteModal.isSoftDeleted || deleteModal.isOwnerDelete ? true : deleteModal.hardDelete;

    const res = await fetch(`/api/comments/${deleteModal.commentId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: deleteReason, hardDelete }),
    });

    if (res.ok) {
      if (deleteModal.isSoftDeleted || deleteModal.hardDelete) {
        setComments((prev) => removeComment(prev, deleteModal.commentId!));
      } else {
        setComments((prev) => markAsDeleted(prev, deleteModal.commentId!, deleteReason, deleteModal.isOwnerDelete));
      }
      setDeleteModal({ show: false, commentId: null });
      setDeleteReason("");
    }
  };

  const removeComment = (comments: Comment[], commentId: string): Comment[] => {
    return comments.filter((comment) => comment.id !== commentId).map((comment) => ({
      ...comment,
      replies: removeComment(comment.replies as Comment[], commentId) as Reply[],
    }));
  };

  const findComment = (comments: Comment[], commentId: string): Comment | null => {
    for (const comment of comments) {
      if (comment.id === commentId) return comment;
      const foundInReplies = findComment(comment.replies as Comment[], commentId);
      if (foundInReplies) return foundInReplies;
    }
    return null;
  };

  const handlePin = async (commentId: string, isPinned: boolean) => {
    const res = await fetch(`/api/comments/${commentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPinned }),
    });

    if (res.ok) {
      fetchComments();
    }
  };

  const handleEdit = async () => {
    if (!editModal.commentId || !editContent.trim()) return;

    const res = await fetch(`/api/comments/${editModal.commentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: editContent }),
    });

    if (res.ok) {
      setEditModal({ show: false, commentId: null });
      setEditContent("");
      fetchComments();
    }
  };

  const handleReport = async () => {
    if (!reportModal.commentId || !reportReason.trim()) return;

    // Check if trying to report own comment
    if (reportModal.ownerId === session?.user?.id) {
      setReportError("Өөрийн сэтгэгдлийг репорт хийх боломжгүй");
      return;
    }

    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commentId: reportModal.commentId, reason: reportReason }),
    });

    if (res.ok) {
      setReportModal({ show: false, commentId: null, ownerId: null });
      setReportReason("");
      setReportError("");
      addToast("Мэдэгдэл амжилттай илгээгдлээ!", "success", 5000);
    } else {
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await res.json();
        setReportError(data.error || "Мэдэгдэл илгээхэд алдаа гарлаа");
      } else {
        setReportError("Мэдэгдэл илгээхэд алдаа гарлаа");
      }
    }
  };

  const markAsDeleted = (comments: Comment[], commentId: string, reason: string, deletedByOwner?: boolean): Comment[] => {
    const recoverableUntil = deletedByOwner ? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString() : null;
    return comments.map((comment) => {
      if (comment.id === commentId) {
        return { ...comment, deletedAt: new Date().toISOString(), deletedReason: reason, deletedByOwner: !!deletedByOwner, recoverableUntil };
      }
      if (comment.replies.length > 0) {
        return {
          ...comment,
          replies: markAsDeleted(comment.replies as Comment[], commentId, reason, deletedByOwner) as Reply[],
        };
      }
      return comment;
    });
  };

  const updateCommentCounts = (
    comments: Comment[],
    commentId: string,
    likeCount: number,
    dislikeCount: number
  ): Comment[] => {
    return comments.map((comment) => {
      if (comment.id === commentId) {
        return { ...comment, likeCount, dislikeCount };
      }
      if (comment.replies.length > 0) {
        return {
          ...comment,
          replies: updateCommentCounts(comment.replies, commentId, likeCount, dislikeCount) as Reply[],
        };
      }
      return comment;
    });
  };

  const startReply = (id: string, username: string) => {
    setReplyingTo({ id, username });
    setReplyContent("");
  };

  const toggleExpandReplies = (commentId: string) => {
    setExpandedReplies((prev) => {
      const next = new Set(prev);
      if (next.has(commentId)) {
        next.delete(commentId);
      } else {
        next.add(commentId);
      }
      return next;
    });
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
    <div className={styles.section} ref={sectionRef}>
      {!isVisible ? (
        <div className={styles.lazyPlaceholder}>
          <h3 className={styles.title}>Сэтгэгдлүүд</h3>
          <div className={styles.lazySpinner} />
        </div>
      ) : (
      <>
      <h3 className={styles.title}>Сэтгэгдлүүд ({totalCount})</h3>

      {session ? (
        <form onSubmit={handleSubmit} className={styles.form}>
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Сэтгэгдэл бичих..."
            className={styles.textarea}
          />
          <div className={styles.formActions}>
            <button
              type="button"
              onClick={() => setIsSpoiler(!isSpoiler)}
              className={`${styles.spoilerToggle} ${isSpoiler ? styles.active : ""}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
              Спойлер
            </button>
            {(session?.user?.role === "admin" || session?.user?.role === "moderator") && (
              <button
                type="button"
                onClick={() => setIsPinned(!isPinned)}
                className={`${styles.spoilerToggle} ${isPinned ? styles.active : ""}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="17" x2="12" y2="22"/>
                  <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/>
                </svg>
                Пин
              </button>
            )}
            <button type="submit" className={styles.button} disabled={loading}>
              {loading ? "Илгээж байна..." : "Сэтгэгдэл илгээх"}
            </button>
          </div>
        </form>
      ) : (
        <p className={styles.loginPrompt}>Сэтгэгдэл бичихийн тулд нэвтэрнэ үү</p>
      )}

      <div className={styles.list}>
        {comments.map((comment) => (
          <div key={comment.id} id={`comment-${comment.id}`} className={styles.comment}>
            <div className={styles.commentMain}>
              <div className={styles.avatar}>
                {comment.user.avatar ? (
                  <Image
                    src={comment.user.avatar}
                    alt={comment.user.username}
                    width={40}
                    height={40}
                    className={styles.avatarImage}
                  />
                ) : (
                  <div className={styles.avatarPlaceholder}>
                    {comment.user.username.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className={styles.commentBody}>
                <div className={styles.header}>
                  <div className={styles.headerLeft}>
                    <Link href={getProfileUrl(comment.user.id)} className={styles.usernameLink}>
                      {comment.user.username}
                    </Link>
                    {comment.user.role === "admin" && (
                      <span className={styles.adminBadge}>Админ</span>
                    )}
                    {comment.user.role === "moderator" && (
                      <span className={styles.modBadge}>Зохицуулагч</span>
                    )}
                    {comment.isPinned && (
                      <span className={styles.pinnedBadge} title="Тогтоосон">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="12" y1="17" x2="12" y2="22"/>
                          <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/>
                        </svg>
                      </span>
                    )}
                    {comment.updatedAt > comment.createdAt && (
                      <span className={styles.editedBadge}>Зассан</span>
                    )}
                  </div>
                  <span className={styles.date}>
                    {new Date(comment.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {comment.deletedAt ? (
                  <div className={styles.removedComment}>
                    {(session?.user?.role === "admin" || session?.user?.role === "moderator") ? (
                      <>
                        <p className={styles.removedText}>{comment.content}</p>
                        <span className={styles.removedBadge}>{comment.deletedByOwner ? "Хэрэглэгч устгасан" : "Зохицуулагч устгасан"}</span>
                      </>
                    ) : (
                      <span className={styles.removedText}>Сэтгэгдэл устгагдсан</span>
                    )}
                  </div>
                ) : comment.isSpoiler && !revealedSpoilers.has(comment.id) ? (
                  <div className={styles.spoilerContainer}>
                    <div className={styles.spoilerBlur}>
                      <p className={styles.spoilerText}>{comment.content}</p>
                    </div>
                    <div className={styles.spoilerOverlay}>
                      <button
                        onClick={() => toggleRevealSpoiler(comment.id)}
                        className={styles.spoilerButton}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                        <span>Спойлер харах</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className={styles.text}>{comment.content}</p>
                )}
                <div className={styles.commentFooter}>
                  <div className={styles.actionsLeft}>
                    {session && (
                      <button
                        onClick={() => startReply(comment.id, comment.user.username)}
                        className={styles.actionButton}
                      >
                        Хариулах
                      </button>
                    )}
                    {(session?.user?.role === "admin" || session?.user?.role === "moderator") && !comment.deletedAt && (
                      <button
                        onClick={() => handlePin(comment.id, !comment.isPinned)}
                        className={styles.actionButton}
                      >
                        {comment.isPinned ? "Чөлөөлөх" : "Пин"}
                      </button>
                    )}
                    {(session?.user?.role === "admin" || session?.user?.role === "moderator") && (
                      <button
                        onClick={() => setDeleteModal({ show: true, commentId: comment.id, isSoftDeleted: !!comment.deletedAt })}
                        className={styles.deleteButton}
                      >
                        Устгах
                      </button>
                    )}
                    {session && session.user.role !== "admin" && session.user.role !== "moderator" && !comment.deletedAt && (
                      <button
                        onClick={() => setReportModal({ show: true, commentId: comment.id, ownerId: comment.user.id })}
                        className={styles.reportButton}
                      >
                        Мэдэгдэх
                      </button>
                    )}
                    {session?.user?.id === comment.user.id && !comment.deletedAt && (
                      <div className={styles.threeDotMenu}>
                        <button
                          onClick={() => setThreeDotMenu(threeDotMenu === comment.id ? null : comment.id)}
                          className={styles.threeDotButton}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="1"/>
                            <circle cx="12" cy="5" r="1"/>
                            <circle cx="12" cy="19" r="1"/>
                          </svg>
                        </button>
                        {threeDotMenu === comment.id && (
                          <div className={styles.threeDotDropdown}>
                            <button
                              onClick={() => { setEditModal({ show: true, commentId: comment.id }); setEditContent(comment.content); setThreeDotMenu(null); }}
                              className={styles.threeDotItem}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                              </svg>
                              Edit
                            </button>
                            <button
                              onClick={() => { setDeleteModal({ show: true, commentId: comment.id, isOwnerDelete: true }); setThreeDotMenu(null); }}
                              className={styles.threeDotItem}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 6h18"/>
                                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                              </svg>
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className={styles.voteButtons}>
                    <button
                      onClick={() => handleLikeDislike(comment.id, "like")}
                      className={styles.voteButton}
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
                        <path d="M7 10v12" />
                        <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z" />
                      </svg>
                      {comment.likeCount > 0 && <span>{comment.likeCount}</span>}
                    </button>
                    <button
                      onClick={() => handleLikeDislike(comment.id, "dislike")}
                      className={styles.voteButton}
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
                        <path d="M17 14V2" />
                        <path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22h0a3.13 3.13 0 0 1-3-3.88Z" />
                      </svg>
                      {comment.dislikeCount > 0 && <span>{comment.dislikeCount}</span>}
                    </button>
                  </div>
                </div>
                {replyingTo?.id === comment.id && (
                  <div className={styles.replyForm}>
                    <div className={styles.replyingTo}>
                      Replying to <span>@{replyingTo.username}</span>
                      <button onClick={() => { setReplyingTo(null); setReplyContent(""); setIsSpoiler(false); }} className={styles.clearReply}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                    </div>
                    <textarea
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      placeholder={`Reply to @${replyingTo.username}...`}
                      className={styles.replyTextarea}
                      autoFocus
                    />
                    <div className={styles.replyActions}>
                      <button
                        type="button"
                        onClick={() => setIsSpoiler(!isSpoiler)}
                        className={`${styles.spoilerToggleSmall} ${isSpoiler ? styles.active : ""}`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                          <line x1="1" y1="1" x2="23" y2="23"/>
                        </svg>
                        Spoiler
                      </button>
                      <div className={styles.replySubmitGroup}>
                        <button
                          onClick={() => { setReplyingTo(null); setReplyContent(""); setIsSpoiler(false); }}
                          className={styles.cancelButton}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleReply}
                          className={styles.submitButton}
                          disabled={loading || !replyContent.trim()}
                        >
                          {loading ? "Нийтлэх..." : "Нийтлэх"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {comment.replies && comment.replies.length > 0 && (
              <div className={styles.replies}>
                {(expandedReplies.has(comment.id) || comment.replies.length <= 1)
                    ? comment.replies.map((reply) => (
                      <div key={reply.id} id={`comment-${reply.id}`} className={styles.reply}>
                        <div className={styles.avatar}>
                          {reply.user.avatar ? (
                            <Image
                              src={reply.user.avatar}
                              alt={reply.user.username}
                              width={32}
                              height={32}
                              className={styles.avatarImage}
                            />
                          ) : (
                            <div className={styles.avatarPlaceholderSmall}>
                              {reply.user.username.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                          <div className={styles.replyBody}>
                            <div className={styles.header}>
                              <div className={styles.headerLeft}>
                                <Link href={getProfileUrl(reply.user.id)} className={styles.usernameLink}>
                                  {reply.user.username}
                                </Link>
                                {reply.user.role === "admin" && (
                                  <span className={styles.adminBadge}>Admin</span>
                                )}
                                {reply.user.role === "moderator" && (
                                  <span className={styles.modBadge}>Mod</span>
                                )}
                                {reply.updatedAt > reply.createdAt && (
                                  <span className={styles.editedBadge}>Edited</span>
                                )}
                                {reply.parent && (
                                  <span className={styles.replyingToUser}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <polyline points="9 14 4 9 9 4"></polyline>
                                      <path d="M20 20v-7a4 4 0 0 0-4-4H4"></path>
                                    </svg>
                                    <Link href={getProfileUrl(reply.parent.user.id)} className={styles.replyingToLink}>
                                      @{reply.parent.user.username}
                                    </Link>
                                  </span>
                                )}
                              </div>
                              <span className={styles.date}>
                                {new Date(reply.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            {reply.deletedAt ? (
                              <div className={styles.removedComment}>
                                {(session?.user?.role === "admin" || session?.user?.role === "moderator") ? (
                                  <>
                                    <p className={styles.removedText}>{reply.content}</p>
                                    <span className={styles.removedBadge}>{reply.deletedByOwner ? "Removed by user" : "Removed by moderator"}</span>
                                  </>
                                ) : (
                                  <span className={styles.removedText}>Comment deleted</span>
                                )}
                              </div>
                            ) : reply.isSpoiler && !revealedSpoilers.has(reply.id) ? (
                              <div className={styles.spoilerContainer}>
                                <div className={styles.spoilerBlur}>
                                  <p className={styles.spoilerText}>{reply.content}</p>
                                </div>
                                <div className={styles.spoilerOverlay}>
                                  <button
                                    onClick={() => toggleRevealSpoiler(reply.id)}
                                    className={styles.spoilerButton}
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                      <circle cx="12" cy="12" r="3"/>
                                    </svg>
                                    <span>Спойлер харах</span>
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <p className={styles.text}>{reply.content}</p>
                            )}
                            <div className={styles.commentFooter}>
                              <div className={styles.actionsLeft}>
                                {session && (
                                  <button
                                    onClick={() => startReply(reply.id, reply.user.username)}
                                    className={styles.actionButton}
                                  >
                                    Хариулах
                                  </button>
                                )}
                                {(session?.user?.role === "admin" || session?.user?.role === "moderator") && (
                                  <button
                                    onClick={() => setDeleteModal({ show: true, commentId: reply.id, isSoftDeleted: !!reply.deletedAt })}
                                    className={styles.deleteButton}
                                  >
                                    Устгах
                                  </button>
                                )}
                                {session && session.user.role !== "admin" && session.user.role !== "moderator" && !reply.deletedAt && (
                                  <button
                                    onClick={() => setReportModal({ show: true, commentId: reply.id, ownerId: reply.user.id })}
                                    className={styles.reportButton}
                                  >
                                    Мэдэгдэх
                                  </button>
                                )}
                                {session?.user?.id === reply.user.id && !reply.deletedAt && (
                                  <div className={styles.threeDotMenu}>
                                    <button
                                      onClick={() => setThreeDotMenu(threeDotMenu === reply.id ? null : reply.id)}
                                      className={styles.threeDotButton}
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="12" r="1"/>
                                        <circle cx="12" cy="5" r="1"/>
                                        <circle cx="12" cy="19" r="1"/>
                                      </svg>
                                    </button>
                                    {threeDotMenu === reply.id && (
                                      <div className={styles.threeDotDropdown}>
                                        <button
                                          onClick={() => { setEditModal({ show: true, commentId: reply.id }); setEditContent(reply.content); setThreeDotMenu(null); }}
                                          className={styles.threeDotItem}
                                        >
                                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                          </svg>
                                          Edit
                                        </button>
                                        <button
                                          onClick={() => { setDeleteModal({ show: true, commentId: reply.id, isOwnerDelete: true }); setThreeDotMenu(null); }}
                                          className={styles.threeDotItem}
                                        >
                                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M3 6h18"/>
                                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                                          </svg>
                                          Delete
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                              <div className={styles.voteButtons}>
                                <button
                                  onClick={() => handleLikeDislike(reply.id, "like")}
                                  className={styles.voteButton}
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
                                    <path d="M7 10v12" />
                                    <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z" />
                                  </svg>
                                  {reply.likeCount > 0 && <span>{reply.likeCount}</span>}
                                </button>
                                <button
                                  onClick={() => handleLikeDislike(reply.id, "dislike")}
                                  className={styles.voteButton}
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
                                    <path d="M17 14V2" />
                                    <path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22h0a3.13 3.13 0 0 1-3-3.88Z" />
                                  </svg>
                                  {reply.dislikeCount > 0 && <span>{reply.dislikeCount}</span>}
                                </button>
                              </div>
                            </div>
                          {replyingTo?.id === reply.id && (
                            <div className={styles.replyForm}>
                              <div className={styles.replyingTo}>
                                Replying to <span>@{replyingTo.username}</span>
                                <button onClick={() => { setReplyingTo(null); setReplyContent(""); setIsSpoiler(false); }} className={styles.clearReply}>
                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                  </svg>
                                </button>
                              </div>
                              <textarea
                                value={replyContent}
                                onChange={(e) => setReplyContent(e.target.value)}
                                placeholder={`Reply to @${replyingTo.username}...`}
                                className={styles.replyTextarea}
                                autoFocus
                              />
                              <div className={styles.replyActions}>
                                <button
                                  type="button"
                                  onClick={() => setIsSpoiler(!isSpoiler)}
                                  className={`${styles.spoilerToggleSmall} ${isSpoiler ? styles.active : ""}`}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                                    <line x1="1" y1="1" x2="23" y2="23"/>
                                  </svg>
                                  Spoiler
                                </button>
                                <div className={styles.replySubmitGroup}>
                                  <button
                                    onClick={() => { setReplyingTo(null); setReplyContent(""); setIsSpoiler(false); }}
                                    className={styles.cancelButton}
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={handleReply}
                                    className={styles.submitButton}
                                    disabled={loading || !replyContent.trim()}
                                  >
                                    {loading ? "Нийтлэх..." : "Нийтлэх"}
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  : comment.replies.slice(0, 1).map((reply) => (
                      <div key={reply.id} id={`comment-${reply.id}`} className={styles.reply}>
                        <div className={styles.avatar}>
                          {reply.user.avatar ? (
                            <Image
                              src={reply.user.avatar}
                              alt={reply.user.username}
                              width={32}
                              height={32}
                              className={styles.avatarImage}
                            />
                          ) : (
                            <div className={styles.avatarPlaceholderSmall}>
                              {reply.user.username.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                          <div className={styles.replyBody}>
                            <div className={styles.header}>
                              <div className={styles.headerLeft}>
                                <Link href={getProfileUrl(reply.user.id)} className={styles.usernameLink}>
                                  {reply.user.username}
                                </Link>
                                {reply.user.role === "admin" && (
                                  <span className={styles.adminBadge}>Admin</span>
                                )}
                                {reply.user.role === "moderator" && (
                                  <span className={styles.modBadge}>Mod</span>
                                )}
                                {reply.updatedAt > reply.createdAt && (
                                  <span className={styles.editedBadge}>Edited</span>
                                )}
                                {reply.parent && (
                                  <span className={styles.replyingToUser}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <polyline points="9 14 4 9 9 4"></polyline>
                                      <path d="M20 20v-7a4 4 0 0 0-4-4H4"></path>
                                    </svg>
                                    <Link href={getProfileUrl(reply.parent.user.id)} className={styles.replyingToLink}>
                                      @{reply.parent.user.username}
                                    </Link>
                                  </span>
                                )}
                              </div>
                              <span className={styles.date}>
                                {new Date(reply.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            {reply.deletedAt ? (
                              <div className={styles.removedComment}>
                                {(session?.user?.role === "admin" || session?.user?.role === "moderator") ? (
                                  <>
                                    <p className={styles.removedText}>{reply.content}</p>
                                    <span className={styles.removedBadge}>{reply.deletedByOwner ? "Removed by user" : "Removed by moderator"}</span>
                                  </>
                                ) : (
                                  <span className={styles.removedText}>Comment deleted</span>
                                )}
                              </div>
                            ) : reply.isSpoiler && !revealedSpoilers.has(reply.id) ? (
                              <div className={styles.spoilerContainer}>
                                <div className={styles.spoilerBlur}>
                                  <p className={styles.spoilerText}>{reply.content}</p>
                                </div>
                                <div className={styles.spoilerOverlay}>
                                  <button
                                    onClick={() => toggleRevealSpoiler(reply.id)}
                                    className={styles.spoilerButton}
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                      <circle cx="12" cy="12" r="3"/>
                                    </svg>
                                    <span>Спойлер харах</span>
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <p className={styles.text}>{reply.content}</p>
                            )}
                            <div className={styles.commentFooter}>
                              <div className={styles.actionsLeft}>
                                {session && (
                                  <button
                                    onClick={() => startReply(reply.id, reply.user.username)}
                                    className={styles.actionButton}
                                  >
                                    Хариулах
                                  </button>
                                )}
                                {(session?.user?.role === "admin" || session?.user?.role === "moderator") && (
                                  <button
                                    onClick={() => setDeleteModal({ show: true, commentId: reply.id, isSoftDeleted: !!reply.deletedAt })}
                                    className={styles.deleteButton}
                                  >
                                    Устгах
                                  </button>
                                )}
                                {session && session.user.role !== "admin" && session.user.role !== "moderator" && !reply.deletedAt && (
                                  <button
                                    onClick={() => setReportModal({ show: true, commentId: reply.id, ownerId: reply.user.id })}
                                    className={styles.reportButton}
                                  >
                                    Мэдэгдэх
                                  </button>
                                )}
                              </div>
                              <div className={styles.voteButtons}>
                                <button
                                  onClick={() => handleLikeDislike(reply.id, "like")}
                                  className={styles.voteButton}
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
                                    <path d="M7 10v12" />
                                    <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z" />
                                  </svg>
                                  {reply.likeCount > 0 && <span>{reply.likeCount}</span>}
                                </button>
                                <button
                                  onClick={() => handleLikeDislike(reply.id, "dislike")}
                                  className={styles.voteButton}
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
                                    <path d="M17 14V2" />
                                    <path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22h0a3.13 3.13 0 0 1-3-3.88Z" />
                                  </svg>
                                  {reply.dislikeCount > 0 && <span>{reply.dislikeCount}</span>}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                {comment.replies.length > 1 && (
                  <button
                    onClick={() => toggleExpandReplies(comment.id)}
                    className={styles.showMoreButton}
                  >
                    {expandedReplies.has(comment.id)
                      ? "Show less"
                      : `Show ${comment.replies.length - 1} more ${comment.replies.length - 1 === 1 ? "reply" : "replies"}`}
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
        {comments.length === 0 && !loading && (
          <p className={styles.empty}>No comments yet</p>
        )}
        {loading && (
          <p className={styles.loading}>Loading comments...</p>
        )}
        {currentPage < totalPages && !loading && (
          <button
            onClick={loadMoreComments}
            className={styles.loadMoreButton}
            disabled={loadingMore}
          >
            {loadingMore ? "Loading..." : `Load ${Math.min(10, totalCount - comments.length)} more comments`}
          </button>
        )}
      </div>

      {deleteModal.show && (
        <div className={styles.modalOverlay} onClick={() => { setDeleteModal({ show: false, commentId: null }); setDeleteReason(""); }}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>{deleteModal.isSoftDeleted ? "Hard Delete Comment" : (deleteModal.isOwnerDelete ? "Delete Comment" : "Delete Comment")}</h3>
              <button onClick={() => { setDeleteModal({ show: false, commentId: null }); setDeleteReason(""); }} className={styles.modalClose}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className={styles.modalBody}>
              {deleteModal.isSoftDeleted ? (
                <p className={styles.hardDeleteWarning}>This comment has been soft-deleted. Hard delete will <strong>permanently remove</strong> it and all its data. This action cannot be undone.</p>
              ) : deleteModal.isOwnerDelete ? (
                <p className={styles.recoverWarning}>Your comment <strong>cannot be recovered</strong> after deletion. This action cannot be undone.</p>
              ) : (
                <>
                  <label className={styles.modalLabel}>Reason for deletion (optional)</label>
                  <textarea
                    value={deleteReason}
                    onChange={(e) => setDeleteReason(e.target.value)}
                    placeholder="Enter reason..."
                    className={styles.modalTextarea}
                    autoFocus
                  />
                  {session?.user?.role === "admin" && (
                    <div className={styles.hardDeleteOption}>
                      <label className={styles.checkboxLabel}>
                        <input
                          type="checkbox"
                          checked={deleteModal.hardDelete === true}
                          onChange={(e) => setDeleteModal({ ...deleteModal, hardDelete: e.target.checked })}
                        />
                        <span>Hard delete (permanent, cannot be recovered)</span>
                      </label>
                    </div>
                  )}
                </>
              )}
            </div>
            <div className={styles.modalFooter}>
              <button onClick={() => { setDeleteModal({ show: false, commentId: null }); setDeleteReason(""); }} className={styles.modalCancelButton}>
                Cancel
              </button>
              <button onClick={handleDelete} className={styles.modalDeleteButton}>
                {deleteModal.isSoftDeleted ? "Hard Delete" : (deleteModal.hardDelete ? "Hard Delete" : "Delete")}
              </button>
            </div>
          </div>
        </div>
      )}

      {editModal.show && (
        <div className={styles.modalOverlay} onClick={() => { setEditModal({ show: false, commentId: null }); setEditContent(""); }}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Edit Comment</h3>
              <button onClick={() => { setEditModal({ show: false, commentId: null }); setEditContent(""); }} className={styles.modalClose}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className={styles.modalBody}>
              <label className={styles.modalLabel}>Comment</label>
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                placeholder="Edit your comment..."
                className={styles.modalTextarea}
                autoFocus
              />
            </div>
            <div className={styles.modalFooter}>
              <button onClick={() => { setEditModal({ show: false, commentId: null }); setEditContent(""); }} className={styles.modalCancelButton}>
                Cancel
              </button>
              <button onClick={handleEdit} className={styles.button} disabled={!editContent.trim()}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {reportModal.show && (
        <div className={styles.modalOverlay} onClick={() => { setReportModal({ show: false, commentId: null, ownerId: null }); setReportReason(""); setReportError(""); }}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Сэтгэгдэл мэдэгдэх</h3>
              <button onClick={() => { setReportModal({ show: false, commentId: null, ownerId: null }); setReportReason(""); setReportError(""); }} className={styles.modalClose}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className={styles.modalBody}>
              {reportModal.ownerId === session?.user?.id && (
                <div className={styles.selfReportWarning}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <span>Өөрийн сэтгэгдлийг репорт хийх боломжгүй</span>
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
                placeholder="Энэ сэтгэгдлийг яагаад мэдэгдэж байгаагаа бичнэ үү..."
                className={styles.modalTextarea}
                autoFocus
                disabled={reportModal.ownerId === session?.user?.id}
              />
            </div>
            <div className={styles.modalFooter}>
              <button onClick={() => { setReportModal({ show: false, commentId: null, ownerId: null }); setReportReason(""); setReportError(""); }} className={styles.modalCancelButton}>
                Цуцлах
              </button>
              <button onClick={handleReport} className={styles.modalReportButton} disabled={!reportReason.trim() || reportModal.ownerId === session?.user?.id}>
                Мэдэгдэх
              </button>
            </div>
          </div>
        </div>
      )}
      <Toast toasts={toasts} onRemove={removeToast} />
      </>
      )}
    </div>
  );
}
