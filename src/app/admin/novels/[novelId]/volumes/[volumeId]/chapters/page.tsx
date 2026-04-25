import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import ChapterGridClient from "@/components/admin/ChapterGridClient";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

interface VolumeChaptersPageProps {
  params: Promise<{ novelId: string; volumeId: string }>;
}

export default async function VolumeChaptersPage({ params }: VolumeChaptersPageProps) {
  const { novelId, volumeId } = await params;

  const [novel, volume, chapters] = await Promise.all([
    db.webnovel.findUnique({
      where: { id: novelId },
      select: { id: true, title: true, slug: true },
    }),
    db.volume.findUnique({
      where: { id: volumeId },
      select: { id: true, title: true, volumeNumber: true },
    }),
    db.volumeChapter.findMany({
      where: { volumeId },
      orderBy: { chapterNumber: "desc" },
      select: {
        id: true,
        chapterNumber: true,
        title: true,
        viewCount: true,
        contentImages: true,
        images: true,
      },
    }),
  ]);

  if (!novel) {
    notFound();
  }

  if (!volume) {
    notFound();
  }

  const chaptersWithCounts = chapters.map((chapter) => {
    let contentImageCount = 0;
    let galleryImageCount = 0;

    try {
      contentImageCount = JSON.parse(chapter.contentImages).length;
    } catch {
      contentImageCount = 0;
    }

    try {
      galleryImageCount = JSON.parse(chapter.images).length;
    } catch {
      galleryImageCount = 0;
    }

    return {
      id: chapter.id,
      chapterNumber: chapter.chapterNumber,
      title: chapter.title,
      viewCount: chapter.viewCount,
      contentImageCount,
      galleryImageCount,
    };
  });

  const totalViews = chaptersWithCounts.reduce((sum, c) => sum + c.viewCount, 0);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{novel.title}</h1>
          <p className={styles.subtitle}>
            {volume.title} — Бүлэг {chaptersWithCounts.length}, {totalViews.toLocaleString()} үзэлт
          </p>
        </div>
        <div className={styles.headerActions}>
          <Link href={`/admin/novels/${novelId}/volumes`} className={styles.backButton}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
            Боть руу буцах
          </Link>
          <Link href={`/admin/novels/${novelId}/volumes/${volumeId}/chapters/new`} className={styles.addButton}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Бүлэг нэмэх
          </Link>
        </div>
      </div>

      {chaptersWithCounts.length === 0 ? (
        <div className={styles.empty}>
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
          <p>Одоогоор бүлэг байхгүй.</p>
          <Link href={`/admin/novels/${novelId}/volumes/${volumeId}/chapters/new`} className={styles.emptyCta}>Эхний бүлгийг нэмэх</Link>
        </div>
      ) : (
        <ChapterGridClient
          chapters={chaptersWithCounts}
          novelId={novelId}
          novelSlug={novel.slug}
          volumeId={volumeId}
          volumeNumber={volume.volumeNumber}
        />
      )}
    </div>
  );
}
