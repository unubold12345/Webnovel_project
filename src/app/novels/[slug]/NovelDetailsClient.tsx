"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import styles from "./page.module.css";
import ScheduleChapterModal from "@/components/ui/ScheduleChapterModal";

interface ScheduledChapter {
  id: string;
  chapterNumber: number;
  title: string;
  scheduledFor: string | Date;
}

interface Chapter {
  id: string;
  chapterNumber: number;
  title: string;
  viewCount: number;
}

interface VolumeChapter {
  id: string;
  chapterNumber: number;
  title: string;
}

interface Volume {
  id: string;
  volumeNumber: number;
  title: string;
  thumbnail: string | null;
  chapters: VolumeChapter[];
}

interface NovelDetailsClientProps {
  novelId: string;
  novelSlug: string;
  novelType: string;
  chapters: Chapter[];
  scheduledChapters: ScheduledChapter[];
  volumes: Volume[];
  isAdmin: boolean;
  isModerator: boolean;
}

export default function NovelDetailsClient({
  novelId,
  novelSlug,
  novelType,
  chapters,
  scheduledChapters: initialScheduledChapters,
  volumes,
  isAdmin,
  isModerator,
}: NovelDetailsClientProps) {
  const [scheduledChapters, setScheduledChapters] = useState(initialScheduledChapters);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showVolumeModal, setShowVolumeModal] = useState(false);
  const [selectedVolume, setSelectedVolume] = useState<Volume | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const existingChapterNumbers = chapters.map((c) => c.chapterNumber);
  const canManage = isAdmin || isModerator;

  const handleDeleteScheduled = async (chapterNumber: number) => {
    setDeletingId(String(chapterNumber));
    try {
      const res = await fetch(
        `/api/admin/novels/${novelId}/scheduled-chapters?chapterNumber=${chapterNumber}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setScheduledChapters((prev) =>
          prev.filter((sc) => sc.chapterNumber !== chapterNumber)
        );
      }
    } catch (error) {
      console.error("Failed to delete scheduled chapter:", error);
    } finally {
      setDeletingId(null);
    }
  };

  const handleScheduleSuccess = () => {
    window.location.reload();
  };

  const handleVolumeClick = (volume: Volume) => {
    setSelectedVolume(volume);
    setShowVolumeModal(true);
  };

  const reversedChapters = [...chapters].sort((a, b) => b.chapterNumber - a.chapterNumber);
  const sortedVolumes = [...volumes].sort((a, b) => b.volumeNumber - a.volumeNumber);

  const manageLink = isAdmin
    ? `/admin/novels/${novelId}/chapters`
    : `/moderator/novels/${novelId}/chapters`;

  const volumeManageLink = `/admin/novels/${novelId}/volumes`;

  const isLightNovel = novelType === "light_novel";

  return (
    <>
      {canManage && (
        <div className={styles.adminBar}>
          {isLightNovel ? (
            <Link href={volumeManageLink} className={styles.addChapterButton}>
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
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Боть нэмэх
            </Link>
          ) : (
            <>
              <Link href={manageLink} className={styles.addChapterButton}>
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
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Бүлэг нэмэх
              </Link>
              <button
                onClick={() => setShowScheduleModal(true)}
                className={styles.scheduleButton}
              >
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
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                Бүлэг товлох
              </button>
            </>
          )}
        </div>
      )}

      {!isLightNovel && scheduledChapters.length > 0 && (
        <div className={styles.scheduledSection}>
          <h2 className={styles.sectionTitle}>Товлосон бүлгүүд</h2>
          <div className={styles.scheduledList}>
            {scheduledChapters.map((sc) => (
              <div key={sc.id} className={styles.scheduledItem}>
              <div className={styles.scheduledInfo}>
                <span className={styles.scheduledNumber}>Бүлэг {sc.chapterNumber}</span>
                <span className={styles.scheduledTitle}>{sc.title}</span>
                <span className={styles.scheduledTime}>
                  {new Date(sc.scheduledFor).toLocaleString()}
                </span>
              </div>
                {canManage && (
                  <button
                    onClick={() => handleDeleteScheduled(sc.chapterNumber)}
                    disabled={deletingId === String(sc.chapterNumber)}
                    className={styles.deleteScheduledButton}
                  >
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
                    >
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {isLightNovel ? (
        <div className={styles.volumesSection}>
          <h2 className={styles.sectionTitle}>Ботиуд</h2>
          <div className={styles.volumeGrid}>
            {sortedVolumes.map((volume) => (
              <button
                key={volume.id}
                onClick={() => handleVolumeClick(volume)}
                className={styles.volumeCard}
              >
                <div className={styles.volumeThumbnailWrapper}>
                  {volume.thumbnail ? (
                    <Image
                      src={volume.thumbnail}
                      alt={volume.title}
                      fill
                      className={styles.volumeThumbnail}
                    />
                  ) : (
                    <div className={styles.volumePlaceholder}>
                      <span>{volume.volumeNumber}</span>
                    </div>
                  )}
                </div>
                <div className={styles.volumeInfo}>
                  <span className={styles.volumeNumber}>Боть {volume.volumeNumber}</span>
                  <span className={styles.volumeTitle}>{volume.title}</span>
                  <span className={styles.volumeChapterCount}>
                    {volume.chapters.length} бүлэг
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className={styles.chapters}>
          <h2 className={styles.sectionTitle}>Бүлгүүд</h2>
          <div className={styles.chapterList}>
            {reversedChapters.map((chapter) => (
              <Link
                key={chapter.id}
                href={`/novels/${novelSlug}/chapters/${chapter.chapterNumber}`}
                className={styles.chapterItem}
              >
                <span>Бүлэг {chapter.chapterNumber}</span>
                <span>{chapter.title}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {showScheduleModal && (
        <ScheduleChapterModal
          novelId={novelId}
          existingChapterNumbers={existingChapterNumbers}
          onClose={() => setShowScheduleModal(false)}
          onSuccess={handleScheduleSuccess}
        />
      )}

      {/* Volume Chapters Modal */}
      {showVolumeModal && selectedVolume && (
        <div className={styles.modalOverlay} onClick={() => setShowVolumeModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                {selectedVolume.title}
                <span className={styles.modalSubtitle}>
                  Боть {selectedVolume.volumeNumber} - {selectedVolume.chapters.length} бүлэг
                </span>
              </h2>
              <button
                onClick={() => setShowVolumeModal(false)}
                className={styles.modalClose}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className={styles.modalContent}>
              {selectedVolume.chapters.length === 0 ? (
                <p className={styles.empty}>Энэ ботьд одоогоор бүлэг байхгүй.</p>
              ) : (
                <div className={styles.volumeChapterList}>
                  {selectedVolume.chapters
                    .sort((a, b) => b.chapterNumber - a.chapterNumber)
                    .map((chapter) => (
                      <Link
                        key={chapter.id}
                        href={`/novels/${novelSlug}/volumes/${selectedVolume.volumeNumber}/chapters/${chapter.chapterNumber}`}
                        className={styles.volumeChapterItem}
                        onClick={() => setShowVolumeModal(false)}
                      >
                        <span>Бүлэг {chapter.chapterNumber}</span>
                        <span>{chapter.title}</span>
                      </Link>
                    ))}
                </div>
              )}
            </div>
            <div className={styles.modalFooter}>
              <Link
                href={`/novels/${novelSlug}/volumes/${selectedVolume.volumeNumber}/chapters/1`}
                className={styles.readFirstButton}
                onClick={() => setShowVolumeModal(false)}
              >
                Эхнээс нь унших
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
