import { db } from "@/lib/db";
import Link from "next/link";
import { getNovelViewCounts } from "@/lib/views";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default async function ModeratorNovelsPage() {
  const [novels, viewCounts] = await Promise.all([
    db.webnovel.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        slug: true,
        author: true,
        status: true,
        totalChapters: true,
        _count: {
          select: { chapters: true },
        },
      },
    }),
    getNovelViewCounts(),
  ]);

  const novelsWithViews = novels.map((novel) => ({
    ...novel,
    totalViews: viewCounts.get(novel.id) || 0,
  }));

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Novels</h1>
        <Link href="/moderator/novels/new" className={styles.addButton}>
          Add Novel
        </Link>
      </div>
      <div className={styles.list}>
        {novels.length === 0 ? (
          <p className={styles.empty}>No novels yet.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Title</th>
                <th>Author</th>
                <th>Status</th>
                <th>Total / Uploaded</th>
                <th>Views</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {novelsWithViews.map((novel) => (
                <tr key={novel.id}>
                  <td>{novel.title}</td>
                  <td>{novel.author}</td>
                  <td>{novel.status}</td>
                  <td>{novel.totalChapters} / {novel._count.chapters}</td>
                  <td>{novel.totalViews.toLocaleString()}</td>
                  <td className={styles.actions}>
                    <Link
                      href={`/moderator/novels/${novel.id}/chapters`}
                      className={styles.actionButton}
                    >
                      Chapters
                    </Link>
                    <Link
                      href={`/novels/${novel.slug}`}
                      className={styles.actionButton}
                    >
                      View
                    </Link>
                    <Link
                      href={`/moderator/novels/${novel.id}/edit`}
                      className={styles.actionButton}
                    >
                      Edit
                    </Link>
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