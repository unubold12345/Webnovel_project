import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
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

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>{novel.title} - Chapters</h1>
          <Link href={`/novels/${novel.slug}`} className={styles.viewButton} target="_blank">
            View Novel
          </Link>
        </div>
        <Link href={`/moderator/novels/${novelId}/chapters/new`} className={styles.addButton}>
          Add Chapter
        </Link>
      </div>
      <div className={styles.list}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>#</th>
              <th>Title</th>
              <th>Views</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {novel.chapters.map((chapter) => (
              <tr key={chapter.id}>
                <td>{chapter.chapterNumber}</td>
                <td>{chapter.title}</td>
                <td>{chapter.viewCount}</td>
                <td>
                  <Link
                    href={`/moderator/novels/${novelId}/chapters/${chapter.id}/edit`}
                    className={styles.actionButton}
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}