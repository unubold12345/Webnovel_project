"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import DeleteChapterButton from "./DeleteChapterButton";
import styles from "./ChapterGridClient.module.css";

interface ChapterItem {
  id: string;
  chapterNumber: number;
  title: string;
  viewCount: number;
  contentImageCount?: number;
  galleryImageCount?: number;
}

interface ChapterGridClientProps {
  chapters: ChapterItem[];
  novelId: string;
  novelSlug: string;
  volumeId?: string;
  volumeNumber?: number;
}

const PAGE_SIZE = 50;

export default function ChapterGridClient({
  chapters,
  novelId,
  novelSlug,
  volumeId,
  volumeNumber,
}: ChapterGridClientProps) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

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

  const getViewHref = (chapterNumber: number) => {
    if (volumeNumber !== undefined) {
      return `/novels/${novelSlug}/volumes/${volumeNumber}/chapters/${chapterNumber}`;
    }
    return `/novels/${novelSlug}/chapters/${chapterNumber}`;
  };

  const getEditHref = (chapterId: string) => {
    if (volumeId) {
      return `/admin/novels/${novelId}/volumes/${volumeId}/chapters/${chapterId}/edit`;
    }
    return `/admin/novels/${novelId}/chapters/${chapterId}/edit`;
  };

  return (
    <div className={styles.wrapper}>
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

      {/* Grid */}
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
                  <div className={styles.statDivider} />
                  {(chapter.contentImageCount ?? 0) > 0 && (
                    <>
                      <div className={styles.stat}>
                        <span className={styles.statValue}>{chapter.contentImageCount}</span>
                        <span className={styles.statLabel}>Зураг</span>
                      </div>
                      <div className={styles.statDivider} />
                    </>
                  )}
                  {(chapter.galleryImageCount ?? 0) > 0 && (
                    <>
                      <div className={styles.stat}>
                        <span className={styles.statValue}>{chapter.galleryImageCount}</span>
                        <span className={styles.statLabel}>Галерей</span>
                      </div>
                      <div className={styles.statDivider} />
                    </>
                  )}
                </div>
              </div>
              <div className={styles.cardActions}>
                <Link href={getViewHref(chapter.chapterNumber)} className={styles.actionBtn} target="_blank">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  Харах
                </Link>
                <Link href={getEditHref(chapter.id)} className={styles.actionBtn}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  Засах
                </Link>
                <DeleteChapterButton
                  novelId={novelId}
                  volumeId={volumeId}
                  chapterId={chapter.id}
                  chapterTitle={chapter.title}
                  chapterNumber={chapter.chapterNumber}
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
    </div>
  );
}
