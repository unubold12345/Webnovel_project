"use client";

import Image from "next/image";
import Link from "next/link";
import styles from "./ContinueReading.module.css";

interface ContinueReadingProps {
  data: Array<{
    novel: {
      id: string;
      title: string;
      slug: string;
      thumbnail: string;
      novelType: string;
    };
    chapter?: {
      id: string;
      chapterNumber: number;
      title: string;
    } | null;
    volumeChapter?: {
      id: string;
      chapterNumber: number;
      title: string;
    } | null;
    volume?: { id: string; title: string; volumeNumber?: number } | null;
    chapterNumber: number;
    isVolumeChapter?: boolean;
    volumeId?: string | null;
  }>;
}

export default function ContinueReading({ data }: ContinueReadingProps) {
  if (!data || data.length === 0) return null;

  const getChapterLink = (item: typeof data[0]) => {
    if (item.isVolumeChapter && item.volumeChapter) {
      // For volume chapters, we need to construct the URL
      // Since we don't have volumeNumber in the data, we'll use a different approach
      // The API should return volume information
      return `/novels/${item.novel.slug}`;
    }
    return `/novels/${item.novel.slug}/chapters/${item.chapterNumber}`;
  };

  const getChapterTitle = (item: typeof data[0]) => {
    if (item.isVolumeChapter && item.volumeChapter) {
      return item.volumeChapter.title;
    }
    return item.chapter?.title || "";
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.heading}>
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
        Үргэлжлүүлэн унших
      </h2>
      <div className={styles.list}>
        {data.map((item) => (
          <Link
            key={item.novel.id}
            href={getChapterLink(item)}
            className={styles.card}
          >
            <div className={styles.thumbnail}>
              <Image
                src={item.novel.thumbnail}
                alt={item.novel.title}
                width={80}
                height={100}
                className={styles.image}
              />
            </div>
            <div className={styles.info}>
              <h3 className={styles.title}>{item.novel.title}</h3>
              {item.isVolumeChapter && item.volume && (
                <span className={styles.volumeTitle}>{item.volume.title}</span>
              )}
              <p className={styles.chapter}>
                Бүлэг {item.chapterNumber} - {getChapterTitle(item)}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
