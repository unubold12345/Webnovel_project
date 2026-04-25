import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getNovelViewCounts } from "@/lib/views";
import PaginatedWrapper from "@/app/admin/components/PaginatedWrapper";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

async function getNovelInfo(novelId: string) {
  const novel = await db.webnovel.findUnique({
    where: { id: novelId },
    include: {
      publisher: {
        select: { id: true, username: true, email: true, avatar: true, role: true, createdAt: true },
      },
      chapters: {
        orderBy: { chapterNumber: "asc" },
        select: {
          id: true, chapterNumber: true, title: true, viewCount: true,
          isPaid: true, coinCost: true, createdAt: true, updatedAt: true,
          _count: { select: { unlockedBy: true, comments: true, reports: true } },
        },
      },
      volumes: {
        orderBy: { volumeNumber: "asc" },
        select: {
          id: true, volumeNumber: true, title: true, createdAt: true, updatedAt: true,
          chapters: {
            orderBy: { chapterNumber: "asc" },
            select: {
              id: true, chapterNumber: true, title: true, viewCount: true,
              isPaid: true, coinCost: true, createdAt: true,
              _count: { select: { unlockedBy: true, reports: true } },
            },
          },
          _count: { select: { chapters: true, comments: true } },
        },
      },
      scheduledChapters: {
        orderBy: { scheduledFor: "asc" },
        select: { id: true, chapterNumber: true, title: true, scheduledFor: true, createdAt: true },
      },
      reviews: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true, rating: true, content: true, isSpoiler: true,
          likeCount: true, dislikeCount: true, createdAt: true,
          user: { select: { id: true, username: true, avatar: true } },
        },
      },
      comments: {
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true, content: true, isSpoiler: true,
          likeCount: true, dislikeCount: true, createdAt: true,
          user: { select: { id: true, username: true, avatar: true } },
        },
      },
      savedNovels: {
        select: {
          id: true, readingStatus: true, createdAt: true,
          user: { select: { id: true, username: true } },
        },
      },
      readingProgress: {
        select: {
          id: true, chapterNumber: true, isVolumeChapter: true,
          createdAt: true, updatedAt: true,
          user: { select: { id: true, username: true } },
        },
      },
      coinHistory: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true, amount: true, balance: true, type: true, description: true, createdAt: true,
          user: { select: { id: true, username: true } },
          chapter: { select: { chapterNumber: true, title: true } },
          volumeChapter: { select: { chapterNumber: true, title: true } },
        },
      },
      _count: {
        select: {
          chapters: true, volumes: true, comments: true, reviews: true,
          savedNovels: true, readingProgress: true, scheduledChapters: true, coinHistory: true,
        },
      },
    },
  });

  if (!novel) return null;

  const chapterIds = novel.chapters.map((c) => c.id);
  const volumeChapterIds = novel.volumes.flatMap((v) => v.chapters.map((c) => c.id));
  const commentIds = novel.comments.map((c) => c.id);

  const reports = await db.report.findMany({
    where: {
      OR: [
        { chapterId: { in: chapterIds } },
        { volumeChapterId: { in: volumeChapterIds } },
        { commentId: { in: commentIds } },
      ],
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, reason: true, category: true, status: true, resolvedAt: true, createdAt: true,
      reporter: { select: { id: true, username: true } },
    },
  });

  const totalChapterViews = novel.chapters.reduce((sum, c) => sum + c.viewCount, 0);
  const totalVolumeChapterViews = novel.volumes.reduce(
    (sum, v) => sum + v.chapters.reduce((s, c) => s + c.viewCount, 0), 0
  );
  const totalViews = totalChapterViews + totalVolumeChapterViews;

  const totalChapterUnlocks = novel.chapters.reduce((sum, c) => sum + c._count.unlockedBy, 0);
  const totalVolumeChapterUnlocks = novel.volumes.reduce(
    (sum, v) => sum + v.chapters.reduce((s, c) => s + c._count.unlockedBy, 0), 0
  );
  const totalUnlocks = totalChapterUnlocks + totalVolumeChapterUnlocks;

  const totalCoinRevenue = novel.coinHistory
    .filter((ch) => ch.type === "unlock")
    .reduce((sum, ch) => sum + Math.abs(ch.amount), 0);
  const totalCoinRefunds = novel.coinHistory
    .filter((ch) => ch.type === "refund")
    .reduce((sum, ch) => sum + Math.abs(ch.amount), 0);

  const averageRating = novel.reviews.length > 0
    ? novel.reviews.reduce((sum, r) => sum + r.rating, 0) / novel.reviews.length
    : 0;

  const ratingDistribution = [1, 2, 3, 4, 5].map((star) => ({
    star,
    count: novel.reviews.filter((r) => r.rating === star).length,
  }));

  const readingStatusDistribution = {
    plan_to_read: novel.savedNovels.filter((s) => s.readingStatus === "plan_to_read").length,
    reading: novel.savedNovels.filter((s) => s.readingStatus === "reading").length,
    completed: novel.savedNovels.filter((s) => s.readingStatus === "completed").length,
    dropped: novel.savedNovels.filter((s) => s.readingStatus === "dropped").length,
  };

  const viewCounts = await getNovelViewCounts();
  const novelTotalViews = viewCounts.get(novel.id) || 0;

  return {
    novel: {
      id: novel.id,
      title: novel.title,
      slug: novel.slug,
      author: novel.author,
      translator: novel.translator,
      summary: novel.summary,
      thumbnail: novel.thumbnail,
      genres: novel.genres,
      novelType: novel.novelType,
      status: novel.status,
      translationStatus: novel.translationStatus,
      totalChapters: novel.totalChapters,
      totalVolumes: novel.totalVolumes,
      hidden: novel.hidden,
      hiddenReason: novel.hiddenReason,
      publisherId: novel.publisherId,
      createdAt: novel.createdAt,
      updatedAt: novel.updatedAt,
      publisher: novel.publisher,
    },
    stats: {
      totalViews: novelTotalViews,
      totalChapters: novel._count.chapters,
      totalVolumes: novel._count.volumes,
      totalComments: novel._count.comments,
      totalReviews: novel._count.reviews,
      totalSaves: novel._count.savedNovels,
      totalReadingProgress: novel._count.readingProgress,
      totalScheduled: novel._count.scheduledChapters,
      totalUnlocks,
      totalCoinRevenue,
      totalCoinRefunds,
      averageRating: Math.round(averageRating * 10) / 10,
      ratingDistribution,
      readingStatusDistribution,
    },
    chapters: novel.chapters,
    volumes: novel.volumes,
    scheduledChapters: novel.scheduledChapters,
    reviews: novel.reviews,
    comments: novel.comments,
    savedNovels: novel.savedNovels,
    readingProgress: novel.readingProgress,
    coinHistory: novel.coinHistory,
    reports,
  };
}

function formatDate(date: Date | string) {
  return new Date(date).toLocaleString("mn-MN", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

function formatNumber(n: number) {
  return n.toLocaleString("mn-MN");
}

export default async function NovelInfoPage({
  params,
}: {
  params: Promise<{ novelId: string }>;
}) {
  const session = await auth();
  const isStaff = session?.user?.role === "admin" || session?.user?.role === "moderator";
  if (!isStaff) {
    return (
      <div className={styles.container}>
        <p className={styles.empty}>Хандах эрхгүй.</p>
      </div>
    );
  }

  const { novelId } = await params;
  const data = await getNovelInfo(novelId);
  if (!data) notFound();

  const { novel, stats, chapters, volumes, scheduledChapters, reviews, comments, savedNovels, readingProgress, coinHistory, reports } = data;
  const isLightNovel = novel.novelType === "light_novel";

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Link href="/admin/novels" className={styles.backLink}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
            Буцах
          </Link>
          <h1 className={styles.title}>{novel.title}</h1>
          <div className={styles.headerBadges}>
            <span className={`${styles.typeBadge} ${isLightNovel ? styles.typeLightNovel : styles.typeWebnovel}`}>
              {isLightNovel ? "Light Novel" : "Webnovel"}
            </span>
            <span className={`${styles.statusBadge} ${novel.status === "completed" ? styles.statusCompleted : styles.statusOngoing}`}>
              {novel.status === "completed" ? "Дууссан" : "Үргэлжилж буй"}
            </span>
            <span className={`${styles.statusBadge} ${novel.translationStatus === "completed" ? styles.statusCompleted : styles.statusOngoing}`}>
              {novel.translationStatus === "completed" ? "Орчуулга дууссан" : "Орчуулж байна"}
            </span>
            {novel.hidden && <span className={styles.hiddenBadge}>Нуусан</span>}
          </div>
        </div>
        <div className={styles.headerActions}>
          <Link href={`/novels/${novel.slug}`} className={styles.actionBtn} target="_blank">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            Харах
          </Link>
          <Link href={`/admin/novels/${novelId}/edit`} className={styles.actionBtn}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Засах
          </Link>
        </div>
      </div>

      {/* Hero section */}
      <div className={styles.hero}>
        {novel.thumbnail ? (
          <div className={styles.thumbnailWrap}>
            <Image
              src={novel.thumbnail}
              alt={novel.title}
              fill
              className={styles.thumbnail}
              sizes="180px"
            />
          </div>
        ) : (
          <div className={styles.thumbnailPlaceholder}>
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          </div>
        )}
        <div className={styles.heroInfo}>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Зохиолч</span>
              <span className={styles.infoValue}>{novel.author}</span>
            </div>
            {novel.translator && (
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Орчуулагч</span>
                <span className={styles.infoValue}>{novel.translator}</span>
              </div>
            )}
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Төрөл</span>
              <span className={styles.infoValue}>{isLightNovel ? "Light Novel" : "Webnovel"}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Төлөв</span>
              <span className={styles.infoValue}>{novel.status === "completed" ? "Дууссан" : "Үргэлжилж буй"}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Орчуулгын төлөв</span>
              <span className={styles.infoValue}>{novel.translationStatus === "completed" ? "Дууссан" : "Үргэлжилж буй"}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Жанр</span>
              <span className={styles.infoValue}>{novel.genres || "Тодорхойгүй"}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Нийтлэгч</span>
              <span className={styles.infoValue}>
                {novel.publisher ? (
                  <Link href={`/admin/users`} className={styles.publisherLink}>{novel.publisher.username}</Link>
                ) : (
                  "Админ"
                )}
              </span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>ID</span>
              <span className={styles.infoValueMono}>{novel.id}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Slug</span>
              <span className={styles.infoValueMono}>{novel.slug}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Үүсгэсэн</span>
              <span className={styles.infoValue}>{formatDate(novel.createdAt)}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Шинэчилсэн</span>
              <span className={styles.infoValue}>{formatDate(novel.updatedAt)}</span>
            </div>
          </div>
          {novel.hidden && novel.hiddenReason && (
            <div className={styles.hiddenAlert}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              <div>
                <strong>Нуусан шалтгаан:</strong> {novel.hiddenReason}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Товч агуулга</h2>
        <div className={styles.summaryBox}>
          <p>{novel.summary || "Товч агуулга байхгүй."}</p>
        </div>
      </div>

      {/* Stats grid */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Статистик</h2>
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <span className={styles.statCardValue}>{formatNumber(stats.totalViews)}</span>
            <span className={styles.statCardLabel}>Нийт үзэлт</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statCardValue}>{formatNumber(stats.totalChapters)}</span>
            <span className={styles.statCardLabel}>{isLightNovel ? "Боть" : "Бүлэг"}</span>
          </div>
          {isLightNovel && (
            <div className={styles.statCard}>
              <span className={styles.statCardValue}>{formatNumber(stats.totalVolumes)}</span>
              <span className={styles.statCardLabel}>Боть</span>
            </div>
          )}
          <div className={styles.statCard}>
            <span className={styles.statCardValue}>{formatNumber(stats.totalComments)}</span>
            <span className={styles.statCardLabel}>Сэтгэгдэл</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statCardValue}>{formatNumber(stats.totalReviews)}</span>
            <span className={styles.statCardLabel}>Үнэлгээ</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statCardValue}>{formatNumber(stats.totalSaves)}</span>
            <span className={styles.statCardLabel}>Хадгалсан</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statCardValue}>{formatNumber(stats.totalReadingProgress)}</span>
            <span className={styles.statCardLabel}>Уншиж буй</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statCardValue}>{formatNumber(stats.totalUnlocks)}</span>
            <span className={styles.statCardLabel}>Түгжээ тайлсан</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statCardValue}>{formatNumber(stats.totalCoinRevenue)}</span>
            <span className={styles.statCardLabel}>Coin орлого</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statCardValue}>{stats.averageRating > 0 ? stats.averageRating.toFixed(1) : "—"}</span>
            <span className={styles.statCardLabel}>Дундаж үнэлгээ</span>
          </div>
        </div>
      </div>

      {/* Reading status distribution */}
      {stats.totalSaves > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Уншигчдын төлөв</h2>
          <div className={styles.statusBars}>
            {[
              { key: "reading", label: "Уншиж байна", count: stats.readingStatusDistribution.reading },
              { key: "completed", label: "Дуусгасан", count: stats.readingStatusDistribution.completed },
              { key: "plan_to_read", label: "Уншихаар төлөвлөсөн", count: stats.readingStatusDistribution.plan_to_read },
              { key: "dropped", label: "Орхисон", count: stats.readingStatusDistribution.dropped },
            ].map((item) => (
              <div key={item.key} className={styles.statusBarRow}>
                <span className={styles.statusBarLabel}>{item.label}</span>
                <div className={styles.statusBarTrack}>
                  <div
                    className={styles.statusBarFill}
                    style={{ width: stats.totalSaves > 0 ? `${(item.count / stats.totalSaves) * 100}%` : "0%" }}
                  />
                </div>
                <span className={styles.statusBarCount}>{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rating distribution */}
      {stats.totalReviews > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Үнэлгээний тархалт</h2>
          <div className={styles.statusBars}>
            {stats.ratingDistribution.map((r) => (
              <div key={r.star} className={styles.statusBarRow}>
                <span className={styles.statusBarLabel}>{r.star} ⭐</span>
                <div className={styles.statusBarTrack}>
                  <div
                    className={styles.statusBarFill}
                    style={{ width: stats.totalReviews > 0 ? `${(r.count / stats.totalReviews) * 100}%` : "0%" }}
                  />
                </div>
                <span className={styles.statusBarCount}>{r.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chapters / Volumes */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          {isLightNovel ? "Боть болон бүлгүүд" : "Бүлгүүд"}
          <span className={styles.sectionCount}>
            {isLightNovel ? `${stats.totalVolumes} боть, ${stats.totalChapters} бүлэг` : `${stats.totalChapters} бүлэг`}
          </span>
        </h2>
        {isLightNovel ? (
          volumes.length === 0 ? (
            <p className={styles.emptyText}>Боть байхгүй.</p>
          ) : (
            <div className={styles.volumeList}>
              {volumes.map((volume) => (
                <div key={volume.id} className={styles.volumeCard}>
                  <div className={styles.volumeHeader}>
                    <h3 className={styles.volumeTitle}>Боть {volume.volumeNumber}: {volume.title}</h3>
                    <span className={styles.volumeMeta}>{volume.chapters.length} бүлэг</span>
                  </div>
                  {volume.chapters.length > 0 && (
                    <div className={styles.chapterTableWrap}>
                      <table className={styles.chapterTable}>
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Гарчиг</th>
                            <th>Үзэлт</th>
                            <th>Төрөл</th>
                            <th>Тайлсан</th>
                            <th>Сэтгэгдэл</th>
                            <th>Гомдол</th>
                          </tr>
                        </thead>
                        <tbody>
                          <PaginatedWrapper itemsPerPage={10} tableColSpan={7}>
                            {volume.chapters.map((ch) => (
                              <tr key={ch.id}>
                                <td>{ch.chapterNumber}</td>
                                <td>{ch.title}</td>
                                <td>{formatNumber(ch.viewCount)}</td>
                                <td>{ch.isPaid ? `${ch.coinCost} coin` : "Үнэгүй"}</td>
                                <td>{formatNumber(ch._count.unlockedBy)}</td>
                                <td>—</td>
                                <td>{formatNumber(ch._count.reports)}</td>
                              </tr>
                            ))}
                          </PaginatedWrapper>
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        ) : (
          chapters.length === 0 ? (
            <p className={styles.emptyText}>Бүлэг байхгүй.</p>
          ) : (
            <div className={styles.chapterTableWrap}>
              <table className={styles.chapterTable}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Гарчиг</th>
                    <th>Үзэлт</th>
                    <th>Төрөл</th>
                    <th>Тайлсан</th>
                    <th>Сэтгэгдэл</th>
                    <th>Гомдол</th>
                  </tr>
                </thead>
                <tbody>
                  <PaginatedWrapper itemsPerPage={10} tableColSpan={7}>
                    {chapters.map((ch) => (
                      <tr key={ch.id}>
                        <td>{ch.chapterNumber}</td>
                        <td>{ch.title}</td>
                        <td>{formatNumber(ch.viewCount)}</td>
                        <td>{ch.isPaid ? `${ch.coinCost} coin` : "Үнэгүй"}</td>
                        <td>{formatNumber(ch._count.unlockedBy)}</td>
                        <td>{formatNumber(ch._count.comments)}</td>
                        <td>{formatNumber(ch._count.reports)}</td>
                      </tr>
                    ))}
                  </PaginatedWrapper>
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {/* Scheduled chapters */}
      {scheduledChapters.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            Товлосон бүлгүүд
            <span className={styles.sectionCount}>{scheduledChapters.length}</span>
          </h2>
          <div className={styles.chapterTableWrap}>
            <table className={styles.chapterTable}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Гарчиг</th>
                  <th>Товлосон огноо</th>
                </tr>
              </thead>
              <tbody>
                <PaginatedWrapper itemsPerPage={10} tableColSpan={3}>
                  {scheduledChapters.map((sch) => (
                    <tr key={sch.id}>
                      <td>{sch.chapterNumber}</td>
                      <td>{sch.title}</td>
                      <td>{formatDate(sch.scheduledFor)}</td>
                    </tr>
                  ))}
                </PaginatedWrapper>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Coin Payments */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Coin гүйлгээ
          <span className={styles.sectionCount}>{formatNumber(stats.totalCoinRevenue)} coin нийт орлого</span>
        </h2>
        {coinHistory.length === 0 ? (
          <p className={styles.emptyText}>Coin гүйлгээ байхгүй.</p>
        ) : (
          <div className={styles.chapterTableWrap}>
            <table className={styles.chapterTable}>
              <thead>
                <tr>
                  <th>Хэрэглэгч</th>
                  <th>Төрөл</th>
                  <th>Хэмжээ</th>
                  <th>Бүлэг</th>
                  <th>Тайлбар</th>
                  <th>Огноо</th>
                </tr>
              </thead>
              <tbody>
                <PaginatedWrapper itemsPerPage={10} tableColSpan={6}>
                  {coinHistory.map((ch) => (
                    <tr key={ch.id}>
                      <td>
                        <Link href={`/user/${ch.user.id}`} className={styles.tableLink}>{ch.user.username}</Link>
                      </td>
                      <td>
                        <span className={`${styles.coinType} ${ch.type === "unlock" ? styles.coinUnlock : ch.type === "refund" ? styles.coinRefund : ch.type === "reset" ? styles.coinReset : styles.coinOther}`}>
                          {ch.type === "unlock" ? "Түгжээ тайлах" : ch.type === "refund" ? "Буцаалт" : ch.type === "reset" ? "Reset" : ch.type}
                        </span>
                      </td>
                      <td className={ch.amount < 0 ? styles.negativeAmount : styles.positiveAmount}>
                        {ch.amount > 0 ? `+${ch.amount}` : ch.amount}
                      </td>
                      <td>
                        {ch.chapter ? `Бүлэг ${ch.chapter.chapterNumber}` : ch.volumeChapter ? `Бүлэг ${ch.volumeChapter.chapterNumber}` : "—"}
                      </td>
                      <td>{ch.description || "—"}</td>
                      <td>{formatDate(ch.createdAt)}</td>
                    </tr>
                  ))}
                </PaginatedWrapper>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reviews */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Үнэлгээнүүд
          <span className={styles.sectionCount}>{stats.totalReviews}</span>
        </h2>
        {reviews.length === 0 ? (
          <p className={styles.emptyText}>Үнэлгээ байхгүй.</p>
        ) : (
          <div className={styles.reviewList}>
            <PaginatedWrapper itemsPerPage={10}>
              {reviews.map((review) => (
                <div key={review.id} className={styles.reviewCard}>
                  <div className={styles.reviewHeader}>
                    <div className={styles.reviewUser}>
                      {review.user.avatar ? (
                        <Image src={review.user.avatar} alt={review.user.username} width={32} height={32} className={styles.reviewAvatar} />
                      ) : (
                        <div className={styles.reviewAvatarPlaceholder}>{review.user.username[0]?.toUpperCase()}</div>
                      )}
                      <Link href={`/user/${review.user.id}`} className={styles.tableLink}>{review.user.username}</Link>
                    </div>
                    <div className={styles.reviewMeta}>
                      <span className={styles.reviewRating}>{"⭐".repeat(review.rating)}</span>
                      <span className={styles.reviewDate}>{formatDate(review.createdAt)}</span>
                    </div>
                  </div>
                  <p className={styles.reviewContent}>{review.content}</p>
                  <div className={styles.reviewStats}>
                    <span>👍 {review.likeCount}</span>
                    <span>👎 {review.dislikeCount}</span>
                    {review.isSpoiler && <span className={styles.spoilerTag}>Спойлер</span>}
                  </div>
                </div>
              ))}
            </PaginatedWrapper>
          </div>
        )}
      </div>

      {/* Saved novels */}
      {savedNovels.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            Хадгалсан хэрэглэгчид
            <span className={styles.sectionCount}>{savedNovels.length}</span>
          </h2>
          <div className={styles.userTags}>
            <PaginatedWrapper itemsPerPage={20}>
              {savedNovels.map((s) => (
                <Link key={s.id} href={`/user/${s.user.id}`} className={styles.userTag}>
                  {s.user.username}
                  <span className={styles.userTagStatus}>
                    {s.readingStatus === "reading" ? "📖" : s.readingStatus === "completed" ? "✅" : s.readingStatus === "dropped" ? "❌" : "📌"}
                  </span>
                </Link>
              ))}
            </PaginatedWrapper>
          </div>
        </div>
      )}

      {/* Comments */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Сүүлийн сэтгэгдлүүд
          <span className={styles.sectionCount}>{stats.totalComments}</span>
        </h2>
        {comments.length === 0 ? (
          <p className={styles.emptyText}>Сэтгэгдэл байхгүй.</p>
        ) : (
          <div className={styles.commentList}>
            <PaginatedWrapper itemsPerPage={10}>
              {comments.map((comment) => (
                <div key={comment.id} className={styles.commentCard}>
                  <div className={styles.commentHeader}>
                    <Link href={`/user/${comment.user.id}`} className={styles.tableLink}>{comment.user.username}</Link>
                    <span className={styles.commentDate}>{formatDate(comment.createdAt)}</span>
                  </div>
                  <p className={styles.commentContent}>{comment.content}</p>
                  <div className={styles.commentStats}>
                    <span>👍 {comment.likeCount}</span>
                    <span>👎 {comment.dislikeCount}</span>
                    {comment.isSpoiler && <span className={styles.spoilerTag}>Спойлер</span>}
                  </div>
                </div>
              ))}
            </PaginatedWrapper>
          </div>
        )}
      </div>

      {/* Reports */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Гомдол
          <span className={styles.sectionCount}>{reports.length}</span>
        </h2>
        {reports.length === 0 ? (
          <p className={styles.emptyText}>Гомдол байхгүй.</p>
        ) : (
          <div className={styles.chapterTableWrap}>
            <table className={styles.chapterTable}>
              <thead>
                <tr>
                  <th>Мэдээлэгч</th>
                  <th>Шалтгаан</th>
                  <th>Ангилал</th>
                  <th>Төлөв</th>
                  <th>Огноо</th>
                </tr>
              </thead>
              <tbody>
                <PaginatedWrapper itemsPerPage={10} tableColSpan={5}>
                  {reports.map((report) => (
                    <tr key={report.id}>
                      <td>
                        <Link href={`/user/${report.reporter.id}`} className={styles.tableLink}>{report.reporter.username}</Link>
                      </td>
                      <td>{report.reason}</td>
                      <td>{report.category}</td>
                      <td>
                        <span className={`${styles.reportStatus} ${report.status === "resolved" ? styles.reportResolved : report.status === "pending" ? styles.reportPending : styles.reportRejected}`}>
                          {report.status === "resolved" ? "Шийдвэрлэгдсэн" : report.status === "pending" ? "Хүлээгдэж буй" : "Татгалзсан"}
                        </span>
                      </td>
                      <td>{formatDate(report.createdAt)}</td>
                    </tr>
                  ))}
                </PaginatedWrapper>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
