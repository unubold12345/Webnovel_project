import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import Link from "next/link";
import DeleteNovelButton from "@/components/admin/DeleteNovelButton";
import { getNovelViewCounts } from "@/lib/views";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default async function AdminNovelsPage() {
  const session = await auth();
  const isAdmin = session?.user?.role === "admin";

  const [novels, viewCounts] = await Promise.all([
    db.webnovel.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        slug: true,
        author: true,
        novelType: true,
        status: true,
        totalChapters: true,
        totalVolumes: true,
        _count: {
          select: { chapters: true, volumes: true },
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
        <h1 className={styles.title}>Webnovel</h1>
        <Link href="/admin/novels/new" className={styles.addButton}>
          Webnovel нэмэх
        </Link>
      </div>
      <div className={styles.list}>
        {novels.length === 0 ? (
          <p className={styles.empty}>Одоогоор webnovel байхгүй.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Гарчиг</th>
                <th>Төрөл</th>
                <th>Зохиолч</th>
                <th>Төлөв</th>
                <th>Нийт / Оруулсан</th>
                <th>Үзэлт</th>
                <th>Үйлдэл</th>
              </tr>
            </thead>
            <tbody>
              {novelsWithViews.map((novel) => (
                <tr key={novel.id}>
                  <td data-label="Гарчиг">{novel.title}</td>
                  <td data-label="Төрөл">
                    <span className={novel.novelType === "light_novel" ? styles.lightNovelBadge : styles.webnovelBadge}>
                      {novel.novelType === "light_novel" ? "Light Novel" : "Webnovel"}
                    </span>
                  </td>
                  <td data-label="Зохиолч">{novel.author}</td>
                  <td data-label="Төлөв">{novel.status}</td>
                  <td data-label="Нийт/Оруулсан">
                    {novel.novelType === "light_novel"
                      ? `${novel.totalVolumes} / ${novel._count.volumes}`
                      : `${novel.totalChapters} / ${novel._count.chapters}`}
                  </td>
                  <td data-label="Үзэлт">{novel.totalViews.toLocaleString()}</td>
                  <td>
                    <div className={styles.actions}>
                      {novel.novelType === "light_novel" ? (
                        <Link
                          href={`/admin/novels/${novel.id}/volumes`}
                          className={styles.actionButton}
                        >
                          Боть
                        </Link>
                      ) : (
                        <Link
                          href={`/admin/novels/${novel.id}/chapters`}
                          className={styles.actionButton}
                        >
                          Бүлэг
                        </Link>
                      )}
                      <Link
                        href={`/novels/${novel.slug}`}
                        className={styles.actionButton}
                      >
                        Харах
                      </Link>
                      <Link
                        href={`/admin/novels/${novel.id}/edit`}
                        className={styles.actionButton}
                      >
                        Засах
                      </Link>
                      {isAdmin && (
                        <DeleteNovelButton novelId={novel.id} novelTitle={novel.title} />
                      )}
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