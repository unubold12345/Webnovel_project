import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import DeleteChapterButton from "@/components/admin/DeleteChapterButton";
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

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>
            {novel.title} - {volume.title} - Бүлгүүд
          </h1>
          <Link href={`/admin/novels/${novelId}/volumes`} className={styles.backButton}>
            Боть руу буцах
          </Link>
        </div>
        <Link href={`/admin/novels/${novelId}/volumes/${volumeId}/chapters/new`} className={styles.addButton}>
          Бүлэг нэмэх
        </Link>
      </div>
      <div className={styles.list}>
        {chaptersWithCounts.length === 0 ? (
          <p className={styles.empty}>Одоогоор бүлэг байхгүй.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>#</th>
                <th>Гарчиг</th>
                <th>Үзэлт</th>
                <th>Агуулгын зургууд</th>
                <th>Нэмэлт зургууд</th>
                <th>Үйлдэл</th>
              </tr>
            </thead>
            <tbody>
              {chaptersWithCounts.map((chapter) => (
                <tr key={chapter.id}>
                  <td data-label="#">{chapter.chapterNumber}</td>
                  <td data-label="Гарчиг">{chapter.title}</td>
                  <td data-label="Үзэлт">{chapter.viewCount.toLocaleString()}</td>
                  <td data-label="Агуулгын зургууд">
                    {chapter.contentImageCount > 0 ? chapter.contentImageCount : "-"}
                  </td>
                  <td data-label="Нэмэлт зургууд">
                    {chapter.galleryImageCount > 0 ? chapter.galleryImageCount : "-"}
                  </td>
                  <td data-label="Үйлдэл">
                    <div className={styles.actions}>
                      <Link
                        href={`/novels/${novel.slug}/volumes/${volume.volumeNumber}/chapters/${chapter.chapterNumber}`}
                        className={styles.actionButton}
                        target="_blank"
                      >
                        Харах
                      </Link>
                      <Link
                        href={`/admin/novels/${novelId}/volumes/${volumeId}/chapters/${chapter.id}/edit`}
                        className={styles.editButton}
                      >
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}