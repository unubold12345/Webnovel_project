"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useToast } from "@/components/ui/ToastContext";
import ConfirmModal from "@/components/ui/ConfirmModal";
import styles from "./page.module.css";

interface IndividualReport {
  id: string;
  reason: string;
  createdAt: string;
  reporter: {
    id: string;
    username: string;
    avatar: string | null;
  };
}

interface ReportGroup {
  id: string;
  targetId: string;
  category: string;
  status: string;
  createdAt: string;
  reportCount: number;
  reports: IndividualReport[];
  reporter: {
    id: string;
    username: string;
    avatar: string | null;
  };
  target: {
    id: string;
    content?: string;
    likeCount?: number;
    dislikeCount?: number;
    rating?: number;
    chapterNumber?: number;
    title?: string;
    createdAt?: string;
    isVolumeChapter?: boolean;
    user?: {
      id: string;
      username: string;
      avatar: string | null;
    };
    novel?: {
      id: string;
      title: string;
      slug: string;
    };
    chapter?: {
      id: string;
      title: string;
      chapterNumber: number;
    };
    volume?: {
      id: string;
      title: string;
      volumeNumber: number;
    };
  } | null;
}

export default function AdminReportsPage() {
  const [reports, setReports] = useState<ReportGroup[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ReportGroup | null>(null);
  const { addToast } = useToast();

  useEffect(() => {
    fetchReports();
  }, [page, statusFilter, categoryFilter]);

  const fetchReports = async () => {
    setLoading(true);
    const res = await fetch(`/api/reports?page=${page}&status=${statusFilter}&category=${categoryFilter}&groupByTarget=true`);
    if (res.ok) {
      const data = await res.json();
      setReports(data.reports);
      setTotalPages(data.totalPages);
      setTotalCount(data.totalCount);
    }
    setLoading(false);
  };

  const handleAction = async (groupId: string, action: "dismiss" | "resolve" | "delete") => {
    if (action === "delete") {
      const group = reports.find((r) => r.id === groupId);
      if (group) {
        setDeleteTarget(group);
        setDeleteModalOpen(true);
      }
      return;
    }

    setActionLoading(groupId);
    const group = reports.find((r) => r.id === groupId);
    if (!group) return;

    const reportIds = group.reports.map((r) => r.id);
    
    try {
      const res = await fetch("/api/admin/reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportIds, action }),
      });

      if (res.ok) {
        addToast(action === "dismiss" ? "Мэдээлэл цуцлагдлаа" : "Мэдээлэл шийдвэрлэгдлээ", "success");
        fetchReports();
      } else {
        addToast("Үйлдэл гүйцэтгэхэд алдаа гарлаа", "error");
      }
    } catch {
      addToast("Үйлдэл гүйцэтгэхэд алдаа гарлаа", "error");
    }
    setActionLoading(null);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    
    setDeleteModalOpen(false);
    setActionLoading(deleteTarget.id);
    
    const reportIds = deleteTarget.reports.map((r) => r.id);
    
    try {
      const res = await fetch("/api/admin/reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportIds, action: "delete" }),
      });

      if (res.ok) {
        addToast("Сэтгэгдэл амжилттай устгагдлаа", "success");
        fetchReports();
      } else {
        addToast("Устгах үед алдаа гарлаа", "error");
      }
    } catch {
      addToast("Устгах үед алдаа гарлаа", "error");
    }
    setActionLoading(null);
    setDeleteTarget(null);
  };

  const toggleExpand = (groupId: string) => {
    setExpandedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  const getLocation = (group: ReportGroup) => {
    if (group.category === "chapter" && group.target?.novel) {
      if (group.target.isVolumeChapter && group.target.volume) {
        return `${group.target.novel.title} - ${group.target.volume.volumeNumber}-р боть - ${group.target.chapterNumber || group.target.title}-р бүлэг`;
      }
      return `${group.target.novel.title} - ${group.target.chapterNumber || group.target.title}-р бүлэг`;
    }
    if (group.category === "review" && group.target?.novel) {
      return group.target.novel.title;
    }
    if (group.target?.novel && group.target?.chapter) {
      return `${group.target.novel.title} - ${group.target.chapter.chapterNumber}-р бүлэг`;
    } else if (group.target?.novel) {
      return group.target.novel.title;
    }
    return "Ерөнхий";
  };

  const getLocationUrl = (group: ReportGroup) => {
    if (group.category === "chapter" && group.target?.novel) {
      if (group.target.isVolumeChapter && group.target.volume) {
        return `/novels/${group.target.novel.slug}/volumes/${group.target.volume.volumeNumber}/chapters/${group.target.chapterNumber}`;
      }
      return `/novels/${group.target.novel.slug}/chapters/${group.target.chapterNumber}`;
    }
    if (group.category === "review" && group.target?.novel) {
      return `/novels/${group.target.novel.slug}`;
    }
    if (group.target?.novel && group.target?.chapter) {
      return `/novels/${group.target.novel.slug}/chapters/${group.target.chapter.chapterNumber}`;
    } else if (group.target?.novel) {
      return `/novels/${group.target.novel.slug}`;
    }
    return "#";
  };

  const getDeleteMessage = () => {
    if (!deleteTarget) return "";
    if (deleteTarget.category === "review") {
      return "Энэ шүүмжийг устгахдаа итгэлтэй байна уу? Энэ үйлдэл буцаагдахгүй.";
    }
    return "Энэ сэтгэгдлийг устгахдаа итгэлтэй байна уу? Энэ үйлдэл буцаагдахгүй.";
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Мэдээллүүд</h1>
        <div className={styles.filters}>
          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>Төлөв:</span>
            <button
              className={`${styles.filterButton} ${statusFilter === "pending" ? styles.active : ""}`}
              onClick={() => { setStatusFilter("pending"); setPage(1); }}
            >
              Хүлээгдэж буй
            </button>
            <button
              className={`${styles.filterButton} ${statusFilter === "resolved" ? styles.active : ""}`}
              onClick={() => { setStatusFilter("resolved"); setPage(1); }}
            >
              Шийдвэрлэгдсэн
            </button>
            <button
              className={`${styles.filterButton} ${statusFilter === "dismissed" ? styles.active : ""}`}
              onClick={() => { setStatusFilter("dismissed"); setPage(1); }}
            >
              Цуцлагдсан
            </button>
            <button
              className={`${styles.filterButton} ${statusFilter === "all" ? styles.active : ""}`}
              onClick={() => { setStatusFilter("all"); setPage(1); }}
            >
              Бүгд
            </button>
          </div>
          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>Ангилал:</span>
            <button
              className={`${styles.filterButton} ${categoryFilter === "all" ? styles.active : ""}`}
              onClick={() => { setCategoryFilter("all"); setPage(1); }}
            >
              Бүгд
            </button>
            <button
              className={`${styles.filterButton} ${categoryFilter === "comment" ? styles.active : ""}`}
              onClick={() => { setCategoryFilter("comment"); setPage(1); }}
            >
              Сэтгэгдэл
            </button>
            <button
              className={`${styles.filterButton} ${categoryFilter === "review" ? styles.active : ""}`}
              onClick={() => { setCategoryFilter("review"); setPage(1); }}
            >
              Шүүмж
            </button>
            <button
              className={`${styles.filterButton} ${categoryFilter === "chapter" ? styles.active : ""}`}
              onClick={() => { setCategoryFilter("chapter"); setPage(1); }}
            >
              Бүлэг
            </button>
            <button
              className={`${styles.filterButton} ${categoryFilter === "other" ? styles.active : ""}`}
              onClick={() => { setCategoryFilter("other"); setPage(1); }}
            >
              Бусад
            </button>
          </div>
        </div>
      </div>

      <div className={styles.list}>
        {loading ? (
          <p className={styles.loading}>Ачаалж байна...</p>
        ) : reports.length === 0 ? (
          <p className={styles.empty}>Мэдээлэл олдсонгүй</p>
        ) : (
          <>
            <div className={styles.reportList}>
              {reports.map((group) => (
                <div key={group.id} className={styles.reportGroup}>
                  {/* Main Report Row */}
                  <div className={styles.reportMain}>
                    <div className={styles.reportHeader}>
                      <div className={styles.reportType}>
                        <span className={`${styles.categoryBadge} ${styles[group.category]}`}>
                          {group.category === "review" ? "Шүүмж" : group.category === "comment" ? "Сэтгэгдэл" : "Бүлэг"}
                        </span>
                        {group.reportCount > 1 && (
                          <span className={styles.reportCountBadge}>
                            {group.reportCount} хэрэглэгч мэдээлсэн
                          </span>
                        )}
                      </div>
                      <div className={styles.reportDate}>
                        {new Date(group.createdAt).toLocaleDateString()}
                      </div>
                    </div>

                    <div className={styles.reportContent}>
                      {group.category === "chapter" ? (
                        <div className={styles.chapterReportContent}>
                          <span className={styles.chapterTitle}>{group.target?.chapterNumber || group.target?.title}-р бүлэг</span>
                        </div>
                      ) : group.category === "review" && group.target ? (
                        <div className={styles.reviewContent}>
                          <div className={styles.reviewHeader}>
                            <div className={styles.reviewAuthor}>
                              {group.target.user?.avatar ? (
                                <Image
                                  src={group.target.user.avatar}
                                  alt={group.target.user.username}
                                  width={24}
                                  height={24}
                                  className={styles.avatar}
                                />
                              ) : (
                                <div className={styles.avatarPlaceholder}>
                                  {group.target.user?.username.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <Link href={`/user/${group.target.user?.id}`} className={styles.usernameLink}>
                                {group.target.user?.username}
                              </Link>
                            </div>
                            <div className={styles.reviewRating}>
                              {[1, 2, 3, 4, 5].map((star) => (
                                <svg
                                  key={star}
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="12"
                                  height="12"
                                  viewBox="0 0 24 24"
                                  fill={star <= (group.target?.rating || 0) ? "#fbbf24" : "none"}
                                  stroke={star <= (group.target?.rating || 0) ? "#fbbf24" : "#6b7280"}
                                  strokeWidth="2"
                                >
                                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                </svg>
                              ))}
                            </div>
                          </div>
                          <p className={styles.commentText}>{group.target.content}</p>
                          {group.target.likeCount !== undefined && (
                            <div className={styles.commentStats}>
                              <span className={styles.stat}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M7 10v12" />
                                  <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z" />
                                </svg>
                                {group.target.likeCount}
                              </span>
                              <span className={styles.stat}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M17 14V2" />
                                  <path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22h0a3.13 3.13 0 0 1-3-3.88Z" />
                                </svg>
                                {group.target.dislikeCount}
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className={styles.commentContent}>
                          {group.target?.user && (
                            <div className={styles.commentAuthor}>
                              {group.target.user.avatar ? (
                                <Image
                                  src={group.target.user.avatar}
                                  alt={group.target.user.username}
                                  width={24}
                                  height={24}
                                  className={styles.avatar}
                                />
                              ) : (
                                <div className={styles.avatarPlaceholder}>
                                  {group.target.user.username.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <Link href={`/user/${group.target.user.id}`} className={styles.usernameLink}>
                                {group.target.user.username}
                              </Link>
                            </div>
                          )}
                          <p className={styles.commentText}>{group.target?.content}</p>
                          {group.target && group.target.likeCount !== undefined && (
                            <div className={styles.commentStats}>
                              <span className={styles.stat}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M7 10v12" />
                                  <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z" />
                                </svg>
                                {group.target.likeCount}
                              </span>
                              <span className={styles.stat}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M17 14V2" />
                                  <path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22h0a3.13 3.13 0 0 1-3-3.88Z" />
                                </svg>
                                {group.target.dislikeCount}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className={styles.reportFooter}>
                      <div className={styles.reportLocation}>
                        <span className={styles.locationLabel}>Байршил:</span>
                        <Link href={getLocationUrl(group)} className={styles.locationLink}>
                          {getLocation(group)}
                        </Link>
                      </div>
                      <div className={styles.reportActions}>
                        {group.reports.length > 1 && (
                          <button
                            onClick={() => toggleExpand(group.id)}
                            className={styles.expandButton}
                          >
                            {expandedGroups.has(group.id) ? "Дэлгэрэнгүй нуух" : "Бүх мэдээлэл харах"}
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
                              className={`${styles.expandIcon} ${expandedGroups.has(group.id) ? styles.expanded : ""}`}
                            >
                              <polyline points="6 9 12 15 18 9" />
                            </svg>
                          </button>
                        )}
                        {group.status === "pending" ? (
                          <div className={styles.actionButtons}>
                            <button
                              onClick={() => handleAction(group.id, "dismiss")}
                              className={styles.dismissButton}
                              disabled={actionLoading !== null}
                            >
                              {actionLoading === group.id ? "..." : "Цуцлах"}
                            </button>
                            {group.category === "chapter" ? (
                              <button
                                onClick={() => handleAction(group.id, "resolve")}
                                className={styles.resolveButton}
                                disabled={actionLoading !== null}
                              >
                                {actionLoading === group.id ? "..." : "Шийдвэрлэсэн"}
                              </button>
                            ) : (
                              <button
                                onClick={() => handleAction(group.id, "delete")}
                                className={styles.deleteButton}
                                disabled={actionLoading !== null}
                              >
                                {actionLoading === group.id ? "..." : "Устгах"}
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className={`${styles.status} ${styles[group.status]}`}>
                            {group.status === "resolved" ? "Шийдвэрлэгдсэн" : "Цуцлагдсан"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Individual Reports */}
                  {expandedGroups.has(group.id) && group.reports.length > 1 && (
                    <div className={styles.individualReports}>
                      <h4 className={styles.individualReportsTitle}>Мэдээлсэн хэрэглэгчид:</h4>
                      {group.reports.map((report, index) => (
                        <div key={report.id} className={styles.individualReport}>
                          <div className={styles.individualReportHeader}>
                            <div className={styles.reporterInfo}>
                              {report.reporter.avatar ? (
                                <Image
                                  src={report.reporter.avatar}
                                  alt={report.reporter.username}
                                  width={20}
                                  height={20}
                                  className={styles.smallAvatar}
                                />
                              ) : (
                                <div className={styles.smallAvatarPlaceholder}>
                                  {report.reporter.username.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <Link href={`/user/${report.reporter.id}`} className={styles.reporterName}>
                                {report.reporter.username}
                              </Link>
                            </div>
                            <span className={styles.reportDateSmall}>
                              {new Date(report.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <div className={styles.individualReportReason}>
                            <span className={styles.reasonLabel}>Шалтгаан:</span>
                            <span className={styles.reasonText}>{report.reason}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Single Report Reason Display */}
                  {group.reports.length === 1 && (
                    <div className={styles.singleReportReason}>
                      <div className={styles.reporterInfo}>
                        {group.reports[0].reporter.avatar ? (
                          <Image
                            src={group.reports[0].reporter.avatar}
                            alt={group.reports[0].reporter.username}
                            width={20}
                            height={20}
                            className={styles.smallAvatar}
                          />
                        ) : (
                          <div className={styles.smallAvatarPlaceholder}>
                            {group.reports[0].reporter.username.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <Link href={`/user/${group.reports[0].reporter.id}`} className={styles.reporterName}>
                          {group.reports[0].reporter.username}
                        </Link>
                      </div>
                      <div className={styles.reasonDisplay}>
                        <span className={styles.reasonLabel}>Шалтгаан:</span>
                        <span className={styles.reasonText}>{group.reports[0].reason}</span>
                      </div>
                    </div>
                  )}
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
                  Өмнөх
                </button>
                <span className={styles.pageInfo}>
                  Хуудас {page} / {totalPages} (Нийт {totalCount})
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className={styles.pageButton}
                >
                  Дараах
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <ConfirmModal
        isOpen={deleteModalOpen}
        title="Сэтгэгдэл устгах"
        message={getDeleteMessage()}
        confirmText="Устгах"
        cancelText="Цуцлах"
        confirmButtonClass="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setDeleteModalOpen(false);
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}
