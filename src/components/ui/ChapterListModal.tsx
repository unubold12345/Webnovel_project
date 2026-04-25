"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import UnlockModal from "./UnlockModal";
import styles from "./ChapterListModal.module.css";

interface Chapter {
  id: string;
  chapterNumber: number;
  title: string;
  isPaid?: boolean;
  coinCost?: number;
}

interface ChapterListModalProps {
  chapters: Chapter[];
  currentChapter: number;
  novelSlug: string;
  volumeNumber?: number;
  unlockedRegular?: Set<string>;
  unlockedVolume?: Set<string>;
  userId?: string | null;
  canManage?: boolean;
  volumeUnlocked?: boolean;
}

export default function ChapterListModal({ chapters, currentChapter, novelSlug, volumeNumber, unlockedRegular, unlockedVolume, userId, canManage = false, volumeUnlocked = false }: ChapterListModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [unlockModal, setUnlockModal] = useState<{ title: string; coinCost: number; type: "chapter" | "volumeChapter"; id: string; redirectUrl: string } | null>(null);
  const [justUnlockedIds, setJustUnlockedIds] = useState<Set<string>>(new Set());
  const chaptersPerPage = 50;

  const currentChapterData = chapters.find(c => c.chapterNumber === currentChapter);
  const buttonText = currentChapterData 
    ? `Бүлэг ${currentChapterData.chapterNumber}${currentChapterData.title ? ` - ${currentChapterData.title}` : ''}`
    : "Бүлэгийн жагсаалт";

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const indexOfLastChapter = currentPage * chaptersPerPage;
  const indexOfFirstChapter = indexOfLastChapter - chaptersPerPage;
  const currentChapters = chapters.slice(indexOfFirstChapter, indexOfLastChapter);
  const totalPages = Math.ceil(chapters.length / chaptersPerPage);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const closeModal = () => {
    setIsOpen(false);
    setCurrentPage(1);
  };

  const isChapterLocked = (chapter: Chapter) => {
    if (!chapter.isPaid) return false;
    if (volumeUnlocked) return false;
    if (!userId) return true;
    const set = volumeNumber ? unlockedVolume : unlockedRegular;
    return !(set?.has(chapter.id) || justUnlockedIds.has(chapter.id));
  };

  const handleChapterClick = (e: React.MouseEvent, chapter: Chapter) => {
    if (!isChapterLocked(chapter)) return;
    if (canManage) {
      // Admins and moderators can navigate through locked chapters
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    if (!userId) {
      window.location.href = "/auth/login";
      return;
    }
    const redirectUrl = volumeNumber
      ? `/novels/${novelSlug}/volumes/${volumeNumber}/chapters/${chapter.chapterNumber}`
      : `/novels/${novelSlug}/chapters/${chapter.chapterNumber}`;
    setUnlockModal({
      title: chapter.title,
      coinCost: chapter.coinCost ?? 0,
      type: volumeNumber ? "volumeChapter" : "chapter",
      id: chapter.id,
      redirectUrl,
    });
  };

  return (
    <>
      <button onClick={() => setIsOpen(true)} className={styles.listButton}>
        {buttonText}
      </button>

      {isOpen && (
        <div className={styles.overlay} onClick={closeModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.header}>
              <h2 className={styles.title}>Бүлгүүд</h2>
              <button onClick={closeModal} className={styles.closeButton}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className={styles.chapterGrid}>
              {currentChapters.map((chapter) => {
                const locked = isChapterLocked(chapter);
                return (
                  <Link
                    key={chapter.id}
                    href={volumeNumber 
                      ? `/novels/${novelSlug}/volumes/${volumeNumber}/chapters/${chapter.chapterNumber}`
                      : `/novels/${novelSlug}/chapters/${chapter.chapterNumber}`
                    }
                    className={`${styles.chapterItem} ${chapter.chapterNumber === currentChapter ? styles.active : ""} ${locked ? styles.locked : ""}`}
                    onClick={(e) => {
                      handleChapterClick(e, chapter);
                      if (!locked) closeModal();
                    }}
                  >
                    <span className={styles.chapterNumber}>
                      {locked && (
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "0.25rem", verticalAlign: "middle" }}>
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                      )}
                      {chapter.chapterNumber}-р бүлэг
                    </span>
                    <span className={styles.chapterTitle}>{chapter.title}</span>
                    {locked && (
                      <span className={styles.chapterCost}>{chapter.coinCost} зоос</span>
                    )}
                  </Link>
                );
              })}
            </div>
            {totalPages > 1 && (
              <div className={styles.pagination}>
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={styles.pageButton}
                >
                  &lt;
                </button>
                <div className={styles.pageNumbers}>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 2 && page <= currentPage + 2)
                    ) {
                      return (
                        <button
                          key={page}
                          onClick={() => handlePageChange(page)}
                          className={`${styles.pageNumber} ${page === currentPage ? styles.activePage : ""}`}
                        >
                          {page}
                        </button>
                      );
                    } else if (page === currentPage - 3 || page === currentPage + 3) {
                      return <span key={page}>...</span>;
                    }
                    return null;
                  })}
                </div>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={styles.pageButton}
                >
                  &gt;
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {unlockModal && (
        <UnlockModal
          title={unlockModal.title}
          coinCost={unlockModal.coinCost}
          onUnlock={async () => {
            const res = await fetch("/api/chapters/unlock", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ type: unlockModal.type, id: unlockModal.id }),
            });
            const data = await res.json();
            if (!res.ok) {
              throw new Error(data.error || "Тайлахад алдаа гарлаа");
            }
            if (!data.alreadyUnlocked) {
              setJustUnlockedIds((prev) => new Set([...prev, unlockModal.id]));
            }
            return { alreadyUnlocked: data.alreadyUnlocked };
          }}
          onClose={() => setUnlockModal(null)}
          redirectUrl={unlockModal.redirectUrl}
        />
      )}
    </>
  );
}
