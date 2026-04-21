"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import styles from "./ChapterListModal.module.css";

interface Chapter {
  id: string;
  chapterNumber: number;
  title: string;
}

interface ChapterListModalProps {
  chapters: Chapter[];
  currentChapter: number;
  novelSlug: string;
  volumeNumber?: number;
}

export default function ChapterListModal({ chapters, currentChapter, novelSlug, volumeNumber }: ChapterListModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
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
              {currentChapters.map((chapter) => (
                <Link
                  key={chapter.id}
                  href={volumeNumber 
                    ? `/novels/${novelSlug}/volumes/${volumeNumber}/chapters/${chapter.chapterNumber}`
                    : `/novels/${novelSlug}/chapters/${chapter.chapterNumber}`
                  }
                  className={`${styles.chapterItem} ${chapter.chapterNumber === currentChapter ? styles.active : ""}`}
                  onClick={closeModal}
                >
                  <span className={styles.chapterNumber}>{chapter.chapterNumber}-р бүлэг</span>
                  <span className={styles.chapterTitle}>{chapter.title}</span>
                </Link>
              ))}
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
    </>
  );
}
