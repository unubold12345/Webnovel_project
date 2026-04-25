import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import ChapterGridClient from "@/components/admin/ChapterGridClient";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default async function ChaptersPage({
  params,
}: {
  params: Promise<{ novelId: string }>;
}) {
  const { novelId } = await params;

  const novel = await db.webnovel.findUnique({
    where: { id: novelId },
    include: {
      chapters: {
        orderBy: { chapterNumber: "desc" },
      },
    },
  });

  if (!novel) {
    notFound();
  }

  const isLightNovel = novel.novelType === "light_novel";

  if (isLightNovel) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.titleRow}>
            <h1 className={styles.title}>{novel.title} - Боть</h1>
            <Link href={`/novels/${novel.slug}`} className={styles.viewButton} target="_blank">
              Харах
            </Link>
          </div>
          <Link href={`/admin/novels/${novelId}/volumes/new`} className={styles.addButton}>
            Боть нэмэх
          </Link>
        </div>
        <p className={styles.empty}>Энэхүү роман нь light novel төрөлтэй тул ботын удирдлага руу шилжинэ үү.</p>
      </div>
    );
  }

  const totalViews = novel.chapters.reduce((sum, c) => sum + c.viewCount, 0);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{novel.title}</h1>
          <p className={styles.subtitle}>Бүлэг — Нийт {novel.chapters.length} бүлэг, {totalViews.toLocaleString()} үзэлт</p>
        </div>
        <div className={styles.headerActions}>
          <Link href={`/novels/${novel.slug}`} className={styles.viewButton} target="_blank">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            Харах
          </Link>
          <Link href={`/admin/novels/${novelId}/chapters/new`} className={styles.addButton}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Бүлэг нэмэх
          </Link>
        </div>
      </div>

      {novel.chapters.length === 0 ? (
        <div className={styles.empty}>
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
          <p>Одоогоор бүлэг байхгүй.</p>
          <Link href={`/admin/novels/${novelId}/chapters/new`} className={styles.emptyCta}>Эхний бүлгийг нэмэх</Link>
        </div>
      ) : (
        <ChapterGridClient
          chapters={novel.chapters.map((c) => ({
            id: c.id,
            chapterNumber: c.chapterNumber,
            title: c.title,
            viewCount: c.viewCount,
          }))}
          novelId={novelId}
          novelSlug={novel.slug}
        />
      )}
    </div>
  );
}
