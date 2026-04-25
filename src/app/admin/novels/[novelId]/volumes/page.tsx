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

  const totalViews = volumesWithStats.reduce((sum, v) => sum + v.totalViews, 0);
  const totalChapters = volumesWithStats.reduce((sum, v) => sum + v.chapterCount, 0);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{novel.title}</h1>
          <p className={styles.subtitle}>Боть — Нийт {volumesWithStats.length} боть, {totalChapters} бүлэг, {totalViews.toLocaleString()} үзэлт</p>
        </div>
        <div className={styles.headerActions}>
          <Link href={`/novels/${novel.slug}`} className={styles.viewButton} target="_blank">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            Харах
          </Link>
          <Link href={`/admin/novels/${novelId}/volumes/new`} className={styles.addButton}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Боть нэмэх
          </Link>
        </div>
      </div>

      {volumesWithStats.length === 0 ? (
        <div className={styles.empty}>
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
          <p>Одоогоор боть байхгүй.</p>
          <Link href={`/admin/novels/${novelId}/volumes/new`} className={styles.emptyCta}>Эхний ботийг нэмэх</Link>
        </div>
      ) : (
        <div className={styles.cardGrid}>
          {volumesWithStats.map((volume) => (
            <div key={volume.id} className={styles.card}>
              <div className={styles.cardCover}>
                {volume.thumbnail ? (
                  <img src={volume.thumbnail} alt={volume.title} className={styles.coverImage} />
                ) : (
                  <div className={styles.coverPlaceholder}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                  </div>
                )}
                <div className={styles.coverBadge}>#{volume.volumeNumber}</div>
              </div>
              <div className={styles.cardBody}>
                <h3 className={styles.cardTitle}>{volume.title}</h3>
                <div className={styles.cardStats}>
                  <div className={styles.cardStat}>
                    <span className={styles.cardStatValue}>{volume.chapterCount}</span>
                    <span className={styles.cardStatLabel}>Бүлэг</span>
                  </div>
                  <div className={styles.cardStatDivider} />
                  <div className={styles.cardStat}>
                    <span className={styles.cardStatValue}>{volume.totalViews.toLocaleString()}</span>
                    <span className={styles.cardStatLabel}>Үзэлт</span>
                  </div>
                </div>
              </div>
              <div className={styles.cardActions}>
                <Link
                  href={`/admin/novels/${novelId}/volumes/${volume.id}/chapters`}
                  className={styles.cardActionBtn}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
                  Бүлгүүд
                </Link>
                <Link
                  href={`/admin/novels/${novelId}/volumes/${volume.id}/edit`}
                  className={styles.cardActionBtn}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  Засах
                </Link>
                <DeleteVolumeButton
                  novelId={novelId}
                  volumeId={volume.id}
                  volumeTitle={volume.title}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}