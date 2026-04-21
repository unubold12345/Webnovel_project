import Link from "next/link";
import Image from "next/image";
import styles from "./RecentlyAddedChapters.module.css";

interface ChapterWithNovel {
  id: string;
  chapterNumber: number;
  title: string;
  createdAt: Date;
  isVolumeChapter?: boolean;
  volume?: {
    id: string;
    volumeNumber: number;
    title: string;
  } | null;
  novel: {
    id: string;
    title: string;
    slug: string;
    thumbnail: string;
  };
}

interface RecentlyAddedChaptersProps {
  chapters: ChapterWithNovel[];
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffMins < 1) return "саяхан";
  if (diffMins < 60) return `${diffMins} минутын өмнө`;
  if (diffHours < 24) return `${diffHours} цагийн өмнө`;
  if (diffDays < 7) return `${diffDays} хоногийн өмнө`;
  if (diffWeeks < 4) return `${diffWeeks} долоо хоногийн өмнө`;
  return `${diffMonths} сарын өмнө`;
}

export default function RecentlyAddedChapters({ chapters }: RecentlyAddedChaptersProps) {
  if (chapters.length === 0) return null;

  const getChapterLink = (chapter: ChapterWithNovel) => {
    if (chapter.isVolumeChapter && chapter.volume) {
      return `/novels/${chapter.novel.slug}/volumes/${chapter.volume.volumeNumber}/chapters/${chapter.chapterNumber}`;
    }
    return `/novels/${chapter.novel.slug}/chapters/${chapter.chapterNumber}`;
  };

  const getChapterLabel = (chapter: ChapterWithNovel) => {
    if (chapter.isVolumeChapter && chapter.volume) {
      return `Боть ${chapter.volume.volumeNumber} - Бүлэг ${chapter.chapterNumber}`;
    }
    return `Бүлэг ${chapter.chapterNumber}`;
  };

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h2 className={styles.title}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          Сүүлд нэмэгдсэн
        </h2>
        <Link href="/chapters" className={styles.seeMore}>
          Бүгд →
        </Link>
      </div>
      <div className={styles.grid}>
        {chapters.map((chapter) => (
          <Link
            key={chapter.id}
            href={getChapterLink(chapter)}
            className={styles.card}
          >
            <div className={styles.thumbnailWrapper}>
              {chapter.novel.thumbnail ? (
                <Image
                  src={chapter.novel.thumbnail}
                  alt={chapter.novel.title}
                  fill
                  className={styles.thumbnail}
                />
              ) : (
                <div className={styles.placeholder}>
                  {chapter.novel.title.charAt(0)}
                </div>
              )}
            </div>
            <div className={styles.content}>
              <h3 className={styles.novelTitle}>{chapter.novel.title}</h3>
              <p className={styles.chapterInfo}>
                {getChapterLabel(chapter)}
                {chapter.title ? ` - ${chapter.title}` : ""}
              </p>
              <div className={styles.timeAgo}>
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
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
                {formatTimeAgo(chapter.createdAt)}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
