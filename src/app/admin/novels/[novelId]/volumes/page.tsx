import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import DeleteVolumeButton from "@/components/admin/DeleteVolumeButton";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default async function VolumesPage({
  params,
}: {
  params: Promise<{ novelId: string }>;
}) {
  const { novelId } = await params;

  const [novel, volumeChapterViews] = await Promise.all([
    db.webnovel.findUnique({
      where: { id: novelId },
      select: { id: true, title: true, slug: true },
    }),
    db.volumeChapter.groupBy({
      by: ["volumeId"],
      _sum: { viewCount: true },
      _count: true,
    }),
  ]);

  if (!novel) {
    notFound();
  }

  const volumes = await db.volume.findMany({
    where: { novelId },
    orderBy: { volumeNumber: "desc" },
    select: {
      id: true,
      volumeNumber: true,
      title: true,
      thumbnail: true,
    },
  });

  const viewCountMap = new Map(volumeChapterViews.map((v) => [v.volumeId, { views: v._sum.viewCount || 0, chapters: v._count }]));

  const volumesWithStats = volumes.map((volume) => {
    const stats = viewCountMap.get(volume.id);
    return {
      ...volume,
      totalViews: stats?.views || 0,
      chapterCount: stats?.chapters || 0,
    };
  });

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
      <div className={styles.list}>
        {volumesWithStats.length === 0 ? (
          <p className={styles.empty}>Одоогоор боть байхгүй.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>#</th>
                <th>Нүүр зураг</th>
                <th>Гарчиг</th>
                <th>Бүлгүүд</th>
                <th>Нийт үзэлт</th>
                <th>Үйлдэл</th>
              </tr>
            </thead>
            <tbody>
              {volumesWithStats.map((volume) => (
                <tr key={volume.id}>
                  <td data-label="#">{volume.volumeNumber}</td>
                  <td data-label="Thumbnail">
                    {volume.thumbnail ? (
                      <img 
                        src={volume.thumbnail} 
                        alt={volume.title}
                        className={styles.thumbnail}
                      />
                    ) : (
                      <span className={styles.noThumbnail}>Байхгүй</span>
                    )}
                  </td>
                  <td data-label="Title">{volume.title}</td>
                  <td data-label="Chapters">
                    {volume.chapterCount > 0 ? (
                      <span>{volume.chapterCount} бүлэг</span>
                    ) : (
                      <span>-</span>
                    )}
                  </td>
                  <td data-label="Total Views">
                    {volume.totalViews > 0 ? (
                      <span>{volume.totalViews.toLocaleString()} үзэлт</span>
                    ) : (
                      <span>-</span>
                    )}
                  </td>
                  <td data-label="Actions">
                    <div className={styles.actions}>
                      <Link
                        href={`/admin/novels/${novelId}/volumes/${volume.id}/chapters`}
                        className={styles.chaptersButton}
                      >
                        Бүлгүүд
                      </Link>
                      <Link
                        href={`/admin/novels/${novelId}/volumes/${volume.id}/edit`}
                        className={styles.editButton}
                      >
                        Засах
                      </Link>
                      <DeleteVolumeButton
                        novelId={novelId}
                        volumeId={volume.id}
                        volumeTitle={volume.title}
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