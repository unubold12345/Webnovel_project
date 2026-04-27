"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { useUserProfile } from "../UserProfileContext";
import styles from "../page.module.css";
import libraryStyles from "./library.module.css";

type ReadingStatus = "reading" | "completed" | "on_hold" | "plan_to_read" | "dropped";

interface LibraryItem {
  id: string;
  novelId: string;
  title: string;
  slug: string;
  author: string;
  thumbnail: string;
  novelType: string;
  status: string;
  totalChapters: number;
  totalVolumes: number;
  uploadedChapters: number;
  uploadedVolumes: number;
  progressPercent: number;
  latestChapter: {
    id: string;
    chapterNumber: number;
    title: string;
    createdAt: string;
  } | null;
  savedAt: string;
  readingStatus: ReadingStatus;
  readingProgress: {
    chapterNumber: number;
    chapterTitle: string | null;
    updatedAt: string;
    isVolumeChapter: boolean;
    volumeId: string | null;
    volumeNumber?: number;
    volumeTitle?: string | null;
  } | null;
}

function getReadingStatusConfig(status: ReadingStatus) {
  switch (status) {
    case "reading":
      return {
        label: "Уншиж байна",
        className: libraryStyles.statusReading,
        icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
      };
    case "completed":
      return {
        label: "Дуусгасан",
        className: libraryStyles.statusCompleted,
        icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
      };
    case "on_hold":
      return {
        label: "Түр зогсоосон",
        className: libraryStyles.statusOnHold,
        icon: "M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z",
      };
    case "dropped":
      return {
        label: "Орхисон",
        className: libraryStyles.statusDropped,
        icon: "M6 18L18 6M6 6l12 12",
      };
    default:
      return {
        label: "Дараа унших",
        className: libraryStyles.statusPlanToRead,
        icon: "M12 6v6m0 0v6m0-6h6m-6 0H6",
      };
  }
}

export default function LibraryPage() {
  const params = useParams();
  const { data: session } = useSession();
  const user = useUserProfile();
  const userId = params.userId as string;
  const [library, setLibrary] = useState<LibraryItem[]>([]);
  const [isOwnProfile, setIsOwnProfile] = useState(false);

  useEffect(() => {
    if (session?.user?.id === userId) {
      setIsOwnProfile(true);
      fetchLibrary();
    }
  }, [session, userId]);

  const fetchLibrary = async () => {
    try {
      const res = await fetch("/api/library");
      if (res.ok) {
        const data = await res.json();
        setLibrary(data);
      }
    } catch (error) {
      console.error("Failed to fetch library:", error);
    }
  };

  const handleRemoveFromLibrary = async (novelId: string) => {
    if (!confirm("Remove this novel from your library?")) return;

    try {
      const res = await fetch(`/api/library/${novelId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setLibrary((prev) => prev.filter((item) => item.novelId !== novelId));
      }
    } catch (error) {
      console.error("Failed to remove from library:", error);
    }
  };

  const handleChangeStatus = async (novelId: string, newStatus: ReadingStatus) => {
    try {
      const res = await fetch("/api/library", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ novelId, readingStatus: newStatus }),
      });
      if (res.ok) {
        setLibrary((prev) =>
          prev.map((item) =>
            item.novelId === novelId ? { ...item, readingStatus: newStatus } : item
          )
        );
      }
    } catch (error) {
      console.error("Failed to change reading status:", error);
    }
  };

  return (
    <div className={styles.contentSection}>
      <h2 className={styles.sectionTitle}>Library</h2>
      
      {!isOwnProfile ? (
        <p className={styles.empty}>You can only view your own library</p>
      ) : library.length === 0 ? (
        <p className={styles.empty}>Одоогоор хадгалагдсан зохиол байхгүй байна.</p>
      ) : (
        <div className={libraryStyles.libraryTable}>
          <div className={libraryStyles.tableHeader}>
            <div className={libraryStyles.colTitle}>Зохиолын нэр</div>
            <div className={libraryStyles.colStatus}>Төлөв</div>
            <div className={libraryStyles.colLastRead}>Сүүлд уншсан</div>
            <div className={libraryStyles.colActions}></div>
          </div>

          <div className={libraryStyles.tableBody}>
            {library.map((item) => {
              const isLightNovel = item.novelType === "light_novel";
              const statusConfig = getReadingStatusConfig(item.readingStatus);

              return (
                <div key={item.id} className={libraryStyles.tableRow}>
                  <div className={libraryStyles.colTitle}>
                    <div className={libraryStyles.novelInfo}>
                      <Link href={`/novels/${item.slug}`} className={libraryStyles.novelThumbnail}>
                        {item.thumbnail ? (
                          <Image
                            src={item.thumbnail}
                            alt={item.title}
                            width={50}
                            height={70}
                            className={libraryStyles.thumbnail}
                          />
                        ) : (
                          <div className={libraryStyles.thumbnailPlaceholder}>
                            {item.title.charAt(0)}
                          </div>
                        )}
                      </Link>
                      <div className={libraryStyles.novelDetails}>
                        <Link href={`/novels/${item.slug}`} className={libraryStyles.novelTitle}>
                          {item.title}
                        </Link>
                      </div>
                    </div>
                  </div>

                  <div className={libraryStyles.colStatus}>
                    <select
                      value={item.readingStatus}
                      onChange={(e) => handleChangeStatus(item.novelId, e.target.value as ReadingStatus)}
                      className={`${libraryStyles.statusSelect} ${statusConfig.className}`}
                    >
                      <option value="reading">Уншиж байна</option>
                      <option value="completed">Дуусгасан</option>
                      <option value="on_hold">Түр зогсоосон</option>
                      <option value="plan_to_read">Дараа унших</option>
                      <option value="dropped">Орхисон</option>
                    </select>
                  </div>

                  <div className={libraryStyles.colLastRead}>
                    {item.readingProgress ? (
                      <div className={libraryStyles.lastReadInfo}>
                        {isLightNovel && item.readingProgress.volumeTitle ? (
                          <>
                            <Link
                              href={`/novels/${item.slug}/volumes/${item.readingProgress.volumeNumber}/chapters/${item.readingProgress.chapterNumber}`}
                              className={libraryStyles.chapterLink}
                            >
                              {item.readingProgress.volumeTitle}
                            </Link>
                            <span className={libraryStyles.chapterNumber}>
                               Бүлэг {item.readingProgress.chapterNumber}
                             </span>
                          </>
                        ) : (
                          <Link
                            href={`/novels/${item.slug}/chapters/${item.readingProgress.chapterNumber}`}
                            className={libraryStyles.chapterLink}
                          >
                             Бүлэг {item.readingProgress.chapterNumber}
                             {item.readingProgress.chapterTitle
                              ? ` - ${item.readingProgress.chapterTitle}`
                              : ""}
                          </Link>
                        )}
                      </div>
                    ) : (
                      <div className={libraryStyles.noReadInfo}>
                        <span className={libraryStyles.notStarted}>N/A (Didn&apos;t read?)</span>
                        {isLightNovel ? (
                          <Link
                            href={`/novels/${item.slug}`}
                            className={libraryStyles.startReadingLink}
                          >
                            Go to Novel Page
                          </Link>
                        ) : item.latestChapter ? (
                          <Link
                            href={`/novels/${item.slug}/chapters/${item.latestChapter.chapterNumber}`}
                            className={libraryStyles.startReadingLink}
                          >
                            Start Reading
                          </Link>
                        ) : null}
                      </div>
                    )}
                  </div>

                  <div className={libraryStyles.colActions}>
                    <button
                      onClick={() => handleRemoveFromLibrary(item.novelId)}
                      className={libraryStyles.removeButton}
                      title="Remove from library"
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
                        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}