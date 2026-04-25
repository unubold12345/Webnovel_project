"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/ui/ToastContext";
import ConfirmModal from "@/components/ui/ConfirmModal";
import Spinner from "@/components/ui/Spinner";
import styles from "./page.module.css";

interface Chapter {
  id: string;
  chapterNumber: number;
  title: string;
  viewCount: number;
}

interface Novel {
  id: string;
  title: string;
  slug: string;
  chapters: Chapter[];
}

function DeleteChapterButton({
  novelId,
  chapterId,
  chapterTitle,
  chapterNumber,
  onDeleted,
}: {
  novelId: string;
  chapterId: string;
  chapterTitle: string;
  chapterNumber: number;
  onDeleted: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { addToast } = useToast();

  const handleDelete = async () => {
    setIsModalOpen(false);
    setDeleting(true);
    try {
      const res = await fetch(`/api/user/novels/${novelId}/chapters/${chapterId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        addToast("Бүлэг амжилттай устгагдлаа", "success");
        onDeleted();
      } else {
        const error = await res.json();
        addToast(error.message || "Бүлэг устгахад алдаа гарлаа", "error");
      }
    } catch {
      addToast("Бүлэг устгахад алдаа гарлаа", "error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        disabled={deleting}
        className={styles.deleteButton}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        {deleting ? "Устгаж байна..." : "Устгах"}
      </button>
      <ConfirmModal
        isOpen={isModalOpen}
        title="Бүлэг устгах"
        message={`#${chapterNumber} - "${chapterTitle}" бүлгийг устгахдаа итгэлтэй байна уу? Энэ үйлдэл буцаагдахгүй.`}
        confirmText="Устгах"
        cancelText="Цуцлах"
        confirmButtonClass="danger"
        onConfirm={handleDelete}
        onCancel={() => setIsModalOpen(false)}
      />
    </>
  );
}

const PAGE_SIZE = 50;

export default function UserChaptersPage() {
  const params = useParams();
  const novelId = params.novelId as string;
  const userId = params.userId as string;
  const [novel, setNovel] = useState<Novel | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const fetchNovel = async () => {
    setLoading(true);
    const res = await fetch(`/api/user/novels/${novelId}`);
    if (res.ok) {
      const data = await res.json();
      setNovel(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchNovel();
  }, [novelId]);

  const chapters = novel?.chapters || [];

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return chapters;
    return chapters.filter(
      (c) =>
        c.title.toLowerCase().includes(term) ||
        String(c.chapterNumber).includes(term)
    );
  }, [chapters, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const totalViews = chapters.reduce((sum, c) => sum + c.viewCount, 0);

  if (loading) {
    return <Spinner />;
  }

  if (!novel) {
    return <div className={styles.container}>Зохиол олдсонгүй</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{novel.title}</h1>
          <p className={styles.subtitle}>Бүлэг — Нийт {chapters.length} бүлэг, {totalViews.toLocaleString()} үзэлт</p>
        </div>
        <div className={styles.headerActions}>
          <Link href={`/novels/${novel.slug}`} className={styles.viewButton} target="_blank">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            Харах
          </Link>
          <Link href={`/user/${userId}/novels/${novelId}/chapters/new`} className={styles.addButton}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Бүлэг нэмэх
          </Link>
        </div>
      </div>

      {chapters.length === 0 ? (
        <div className={styles.empty}>
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
          <p>Одоогоор бүлэг байхгүй.</p>
          <Link href={`/user/${userId}/novels/${novelId}/chapters/new`} className={styles.emptyCta}>Эхний бүлгийг нэмэх</Link>
        </div>
      ) : (
        <>
          {/* Search */}
          <div className={styles.toolbar}>
            <div className={styles.searchBox}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input
                type="text"
                placeholder="Бүлэг хайх (дугаар эсвэл гарчиг)..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className={styles.searchInput}
              />
              {search && (
                <button className={styles.searchClear} onClick={() => handleSearch("")}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              )}
            </div>
            <span className={styles.resultCount}>{filtered.length} бүлэг</span>
          </div>

          {paginated.length === 0 ? (
            <div className={styles.empty}>
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <p>Хайлтад тохирох бүлэг олдсонгүй.</p>
            </div>
          ) : (
            <div className={styles.grid}>
              {paginated.map((chapter) => (
                <div key={chapter.id} className={styles.card}>
                  <div className={styles.cardHeader}>
                    <span className={styles.chapterBadge}>#{chapter.chapterNumber}</span>
                  </div>
                  <div className={styles.cardBody}>
                    <h3 className={styles.cardTitle}>{chapter.title || `Бүлэг ${chapter.chapterNumber}`}</h3>
                    <div className={styles.cardStats}>
                      <div className={styles.stat}>
                        <span className={styles.statValue}>{chapter.viewCount.toLocaleString()}</span>
                        <span className={styles.statLabel}>Үзэлт</span>
                      </div>
                    </div>
                  </div>
                  <div className={styles.cardActions}>
                    <Link
                      href={`/novels/${novel.slug}/chapters/${chapter.chapterNumber}`}
                      className={styles.actionBtn}
                      target="_blank"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      Харах
                    </Link>
                    <Link
                      href={`/user/${userId}/novels/${novelId}/chapters/${chapter.id}/edit`}
                      className={styles.actionBtn}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      Засах
                    </Link>
                    <DeleteChapterButton
                      novelId={novelId}
                      chapterId={chapter.id}
                      chapterTitle={chapter.title}
                      chapterNumber={chapter.chapterNumber}
                      onDeleted={fetchNovel}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                className={styles.pageBtn}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  className={`${styles.pageBtn} ${p === page ? styles.pageBtnActive : ""}`}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              ))}
              <button
                className={styles.pageBtn}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
