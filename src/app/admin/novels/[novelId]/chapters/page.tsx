import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import DeleteChapterButton from "@/components/admin/DeleteChapterButton";
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

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>{novel.title} - Бүлэг</h1>
          <Link href={`/novels/${novel.slug}`} className={styles.viewButton} target="_blank">
            Webnovel харах
          </Link>
        </div>
        <Link href={`/admin/novels/${novelId}/chapters/new`} className={styles.addButton}>
          Бүлэг нэмэх
        </Link>
      </div>
      <div className={styles.list}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>#</th>
              <th>Гарчиг</th>
              <th>Үзэлт</th>
              <th>Үйлдэл</th>
            </tr>
          </thead>
          <tbody>
            {novel.chapters.map((chapter) => (
              <tr key={chapter.id}>
                <td data-label="#">{chapter.chapterNumber}</td>
                <td data-label="Title">{chapter.title}</td>
                <td data-label="Views">{chapter.viewCount}</td>
                <td data-label="Actions">
                  <Link
                    href={`/novels/${novel.slug}/chapters/${chapter.chapterNumber}`}
                    className={styles.actionButton}
                    target="_blank"
                  >
                    Харах
                  </Link>
                  <Link
                    href={`/admin/novels/${novelId}/chapters/${chapter.id}/edit`}
                    className={styles.actionButton}
                  >
                    Засах
                  </Link>
                  <DeleteChapterButton
                    novelId={novelId}
                    chapterId={chapter.id}
                    chapterTitle={chapter.title}
                    chapterNumber={chapter.chapterNumber}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}