"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import styles from "./page.module.css";
import ScheduleChapterModal from "@/components/ui/ScheduleChapterModal";
import UnlockModal from "@/components/ui/UnlockModal";

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
  isPaid: boolean;
  coinCost: number;
}

interface VolumeChapter {
  id: string;
  chapterNumber: number;
  title: string;
  viewCount: number;
  isPaid: boolean;
  coinCost: number;
}

interface Volume {
  id: string;
  volumeNumber: number;
  title: string;
  thumbnail: string | null;
  isPaid: boolean;
  coinCost: number;
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
  unlockedRegular: Set<string>;
  unlockedVolume: Set<string>;
  unlockedVolumes: Set<string>;
  volumeRemainingCosts: Record<string, number>;
  isLoggedIn: boolean;
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
  unlockedRegular,
  unlockedVolume,
  unlockedVolumes,
  volumeRemainingCosts,
  isLoggedIn,
}: NovelDetailsClientProps) {
  const [scheduledChapters, setScheduledChapters] = useState(initialScheduledChapters);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showVolumeModal, setShowVolumeModal] = useState(false);
  const [selectedVolume, setSelectedVolume] = useState<Volume | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [unlockModal, setUnlockModal] = useState<{ open: boolean; title: string; coinCost: number; type: "chapter" | "volumeChapter" | "volume"; id: string; redirectUrl?: string } | null>(null);
  const [localUnlockedRegular, setLocalUnlockedRegular] = useState<Set<string>>(unlockedRegular);
  const [localUnlockedVolume, setLocalUnlockedVolume] = useState<Set<string>>(unlockedVolume);
  const [localUnlockedVolumes, setLocalUnlockedVolumes] = useState<Set<string>>(unlockedVolumes);

  const existingChapterNumbers = chapters.map((c) => c.chapterNumber);
  const canManage = isAdmin || isModerator;

  const handleUnlock = async () => {
    if (!unlockModal) return { alreadyUnlocked: false };
    const res = await fetch("/api/chapters/unlock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: unlockModal.type, id: unlockModal.id }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Тайлахад алдаа гарлаа");
    }
    if (data.alreadyUnlocked) {
      return { alreadyUnlocked: true };
    }
    // Update local state immediately
    if (unlockModal.type === "chapter") {
      setLocalUnlockedRegular((prev) => new Set([...prev, unlockModal.id]));
    } else if (unlockModal.type === "volumeChapter") {
      setLocalUnlockedVolume((prev) => new Set([...prev, unlockModal.id]));
    } else if (unlockModal.type === "volume") {
      setLocalUnlockedVolumes((prev) => new Set([...prev, unlockModal.id]));
    }
    return { alreadyUnlocked: false };
  };

  const isChapterLocked = (chapter: Chapter | VolumeChapter, type: "chapter" | "volumeChapter", volume?: { id: string; isPaid: boolean; coinCost: number }) => {
    if (type === "volumeChapter" && volume) {
      if (localUnlockedVolumes.has(volume.id)) return false;
      if (volume.isPaid) {
        // Chapter marked as free inside paid volume
        if (!chapter.isPaid) return false;
        // If remaining cost is 0 (already paid enough via individual chapters), treat as unlocked
        if ((volumeRemainingCosts[volume.id] ?? volume.coinCost) === 0) return false;
        // Honor previously unlocked individual chapters even after volume becomes paid
        if (localUnlockedVolume.has(chapter.id)) return false;
        return true;
      }
    }
    if (!chapter.isPaid) return false;
    if (!isLoggedIn) return true;
    const set = type === "chapter" ? localUnlockedRegular : localUnlockedVolume;
    return !set.has(chapter.id);
  };

  const handleChapterClick = (e: React.MouseEvent, chapter: Chapter | VolumeChapter, type: "chapter" | "volumeChapter", volumeNum?: number, volume?: { id: string; isPaid: boolean; coinCost: number; title: string }) => {
    if (isChapterLocked(chapter, type, volume)) {
      if (canManage) {
        // Admins and moderators can navigate through locked chapters
        return;
      }
      e.preventDefault();
      if (!isLoggedIn) {
        window.location.href = "/auth/login";
        return;
      }
      // If volume is paid and not unlocked, show volume unlock modal
      if (type === "volumeChapter" && volume && volume.isPaid && !localUnlockedVolumes.has(volume.id)) {
        setUnlockModal({
          open: true,
          title: volume.title,
          coinCost: volume.coinCost,
          type: "volume",
          id: volume.id,
        });
        return;
      }
      const redirectUrl = type === "chapter"
        ? `/novels/${novelSlug}/chapters/${chapter.chapterNumber}`
        : `/novels/${novelSlug}/volumes/${volumeNum}/chapters/${chapter.chapterNumber}`;
      setUnlockModal({
        open: true,
        title: chapter.title,
        coinCost: chapter.coinCost,
        type,
        id: chapter.id,
        redirectUrl,
      });
    }
  };



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
                    {volume.isPaid && !localUnlockedVolumes.has(volume.id) && (
                      <span style={{ marginLeft: "0.5rem", color: "var(--warning)", fontWeight: 600 }}>
                        ({(volumeRemainingCosts[volume.id] ?? volume.coinCost)} зоос)
                      </span>
                    )}
                    {volume.isPaid && localUnlockedVolumes.has(volume.id) && (
                      <span style={{ marginLeft: "0.5rem", color: "var(--success)", fontWeight: 600 }}>
                        (Тайлсан)
                      </span>
                    )}
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
            {reversedChapters.map((chapter) => {
              const locked = isChapterLocked(chapter, "chapter");
              return (
                <Link
                  key={chapter.id}
                  href={`/novels/${novelSlug}/chapters/${chapter.chapterNumber}`}
                  className={`${styles.chapterItem} ${locked ? styles.lockedChapterItem : ""}`}
                  onClick={(e) => handleChapterClick(e, chapter, "chapter")}
                >
                  <span>Бүлэг {chapter.chapterNumber}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
                    {locked && (
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--warning)" }}>
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    )}
                    {chapter.title}
                    {locked && (
                      <span style={{ fontSize: "0.6875rem", color: "var(--warning)", fontWeight: 600, whiteSpace: "nowrap" }}>
                        {chapter.coinCost} зоос
                      </span>
                    )}
                  </span>
                </Link>
              );
            })}
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

      {/* Unlock Modal */}
      {unlockModal?.open && (
        <UnlockModal
          title={unlockModal.title}
          coinCost={unlockModal.coinCost}
          onUnlock={handleUnlock}
          onClose={() => setUnlockModal(null)}
          redirectUrl={unlockModal.redirectUrl}
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
              {selectedVolume.isPaid && !canManage && !localUnlockedVolumes.has(selectedVolume.id) && (
                <div className={styles.volumeUnlockBanner}>
                  <span>Энэ боть төлбөртэй. Бүх бүлгийг нээнэ үү.</span>
                  <button
                    onClick={() => {
                      if (!isLoggedIn) {
                        window.location.href = "/auth/login";
                        return;
                      }
                      const remaining = volumeRemainingCosts[selectedVolume.id] ?? selectedVolume.coinCost;
                      setUnlockModal({
                        open: true,
                        title: selectedVolume.title,
                        coinCost: remaining,
                        type: "volume",
                        id: selectedVolume.id,
                      });
                    }}
                    className={styles.volumeUnlockButton}
                  >
                    {(volumeRemainingCosts[selectedVolume.id] ?? selectedVolume.coinCost)} зоосоор тайлах
                  </button>
                </div>
              )}
              {selectedVolume.chapters.length === 0 ? (
                <p className={styles.empty}>Энэ ботьд одоогоор бүлэг байхгүй.</p>
              ) : (
                <div className={styles.volumeChapterList}>
                  {selectedVolume.chapters
                    .sort((a, b) => b.chapterNumber - a.chapterNumber)
                    .map((chapter) => {
                      const locked = isChapterLocked(chapter, "volumeChapter", selectedVolume);
                      return (
                        <Link
                          key={chapter.id}
                          href={`/novels/${novelSlug}/volumes/${selectedVolume.volumeNumber}/chapters/${chapter.chapterNumber}`}
                          className={`${styles.volumeChapterItem} ${locked ? styles.lockedChapterItem : ""}`}
                          onClick={(e) => {
                            if (locked && !canManage) {
                              e.preventDefault();
                              e.stopPropagation();
                              handleChapterClick(e, chapter, "volumeChapter", selectedVolume.volumeNumber, selectedVolume);
                            } else {
                              setShowVolumeModal(false);
                            }
                          }}
                        >
                          <span>Бүлэг {chapter.chapterNumber}</span>
                          <span style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
                            {locked && (
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--warning)" }}>
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                              </svg>
                            )}
                            {chapter.title}
                            {locked && (
                              <span style={{ fontSize: "0.6875rem", color: "var(--warning)", fontWeight: 600, whiteSpace: "nowrap" }}>
                                {chapter.coinCost} зоос
                              </span>
                            )}
                          </span>
                        </Link>
                      );
                    })}
                </div>
              )}
            </div>
            <div className={styles.modalFooter}>
              <Link
                href={`/novels/${novelSlug}/volumes/${selectedVolume.volumeNumber}/chapters/1`}
                className={styles.readFirstButton}
                onClick={(e) => {
                  if (selectedVolume.isPaid && !canManage && !localUnlockedVolumes.has(selectedVolume.id)) {
                    e.preventDefault();
                    if (!isLoggedIn) {
                      window.location.href = "/auth/login";
                      return;
                    }
                    setUnlockModal({
                      open: true,
                      title: selectedVolume.title,
                      coinCost: selectedVolume.coinCost,
                      type: "volume",
                      id: selectedVolume.id,
                    });
                    return;
                  }
                  setShowVolumeModal(false);
                }}
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
