import { db } from "@/lib/db";
import { getNovelViewCounts } from "@/lib/views";
import styles from "./page.module.css";

// Force dynamic rendering - don't try to fetch data at build time
export const dynamic = "force-dynamic";

const getDateRange = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
};

export default async function AdminDashboard() {
  const today = getDateRange(0);
  const lastWeek = getDateRange(7);
  const lastMonth = getDateRange(30);

  const [
    novelCount,
    chapterCount,
    volumeCount,
    volumeChapterCount,
    userCount,
    commentCount,
    reviewCount,
    reportCount,
    notificationCount,
    savedNovelCount,
    readingProgressCount,
    scheduledChapters,
    totalCommentLikes,
    totalReviewLikes,
    totalReplies,
    pinnedComments,
  ] = await Promise.all([
    db.webnovel.count(),
    db.chapter.count(),
    db.volume.count(),
    db.volumeChapter.count(),
    db.user.count(),
    db.comment.count(),
    db.review.count(),
    db.report.count(),
    db.notification.count(),
    db.savedNovel.count(),
    db.readingProgress.count(),
    db.scheduledChapter.count(),
    db.commentLike.count({ where: { type: "like" } }),
    db.reviewLike.count({ where: { type: "like" } }),
    db.comment.count({ where: { parentId: { not: null } } }),
    db.comment.count({ where: { isPinned: true } }),
  ]);

  const [
    newUsersToday,
    newUsersThisWeek,
    newUsersThisMonth,
    newNovelsThisWeek,
    newChaptersThisWeek,
    newCommentsToday,
    newReviewsToday,
  ] = await Promise.all([
    db.user.count({ where: { createdAt: { gte: today } } }),
    db.user.count({ where: { createdAt: { gte: lastWeek } } }),
    db.user.count({ where: { createdAt: { gte: lastMonth } } }),
    db.webnovel.count({ where: { createdAt: { gte: lastWeek } } }),
    db.chapter.count({ where: { createdAt: { gte: lastWeek } } }),
    db.comment.count({ where: { createdAt: { gte: today } } }),
    db.review.count({ where: { createdAt: { gte: today } } }),
  ]);

  const [
    userRoleGroups,
    novelStatusGroups,
    reportStatusGroups,
    chapterViewsAgg,
    volumeChapterViewsAgg,
    volumes,
  ] = await Promise.all([
    db.user.groupBy({ by: ["role"], _count: true }),
    db.webnovel.groupBy({ by: ["status"], _count: true }),
    db.report.groupBy({ by: ["status"], _count: true }),
    db.chapter.aggregate({ _sum: { viewCount: true } }),
    db.volumeChapter.aggregate({ _sum: { viewCount: true } }),
    db.volume.findMany({ select: { id: true, novelId: true } }),
  ]);

  const totalViews = (chapterViewsAgg._sum.viewCount || 0) + (volumeChapterViewsAgg._sum.viewCount || 0);
  const avgViewsPerChapter = (chapterCount + volumeChapterCount) > 0
    ? Math.round(totalViews / (chapterCount + volumeChapterCount))
    : 0;

  const roleMap = new Map(userRoleGroups.map((g) => [g.role, g._count]));
  const adminCount = roleMap.get("admin") || 0;
  const moderatorCount = roleMap.get("moderator") || 0;
  const regularUserCount = roleMap.get("user") || 0;

  const statusMap = new Map(novelStatusGroups.map((g) => [g.status, g._count]));
  const ongoingNovels = statusMap.get("ongoing") || 0;
  const completedNovels = statusMap.get("completed") || 0;
  const droppedNovels = statusMap.get("dropped") || 0;

  const reportMap = new Map(reportStatusGroups.map((g) => [g.status, g._count]));
  const pendingReports = reportMap.get("pending") || 0;
  const resolvedReports = reportMap.get("resolved") || 0;

  const reportsToday = await db.report.count({ where: { createdAt: { gte: today } } });

  const restrictedUsers = await db.user.count({ where: { isRestricted: true } });

  const [
    viewCounts,
    novelsForStats,
    recentUsers,
    recentComments,
  ] = await Promise.all([
    getNovelViewCounts(),
    db.webnovel.findMany({
      select: {
        id: true,
        title: true,
        _count: { select: { reviews: true } },
        reviews: { select: { rating: true } },
      },
    }),
    db.user.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: { id: true, username: true, createdAt: true },
    }),
    db.comment.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: { id: true, content: true, createdAt: true, user: { select: { username: true } } },
    }),
  ]);

  const novelsWithStats = novelsForStats.map((novel) => {
    const totalViews = viewCounts.get(novel.id) || 0;
    const avgRating = novel.reviews.length > 0
      ? (novel.reviews.reduce((sum, r) => sum + r.rating, 0) / novel.reviews.length).toFixed(1)
      : "0.0";
    const reviewCount = novel._count.reviews;

    return {
      id: novel.id,
      title: novel.title,
      _count: novel._count,
      totalViews,
      avgRating,
      reviewCount,
    };
  });

  const topNovelsByViews = novelsWithStats
    .sort((a, b) => b.totalViews - a.totalViews)
    .slice(0, 5);

  const topNovelsByRating = novelsWithStats
    .filter((n) => n.reviewCount >= 3)
    .sort((a, b) => parseFloat(b.avgRating) - parseFloat(a.avgRating))
    .slice(0, 5);

  const userGrowthRate = newUsersThisWeek > 0
    ? Math.round((newUsersThisWeek / userCount) * 100)
    : 0;

  const engagementRate = userCount > 0
    ? Math.round(((commentCount + reviewCount) / userCount) * 100)
    : 0;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Хяналтын самбар</h1>
        <span className={styles.lastUpdated}>Шинэчлэгдсэн: {new Date().toLocaleString("mn-MN")}</span>
      </div>

      {/* Main Overview Stats */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Ерөнхий мэдээлэл</h2>
        <div className={styles.statsGrid}>
          <div className={`${styles.statCard} ${styles.statPrimary}`}>
            <div className={styles.statIcon}>📚</div>
            <div className={styles.statContent}>
              <span className={styles.statValue}>{novelCount.toLocaleString()}</span>
              <span className={styles.statLabel}>Нийт Novels</span>
              <span className={styles.statChange}>+{newNovelsThisWeek} энэ 7 хоногт</span>
            </div>
          </div>

          <div className={`${styles.statCard} ${styles.statSecondary}`}>
            <div className={styles.statIcon}>📖</div>
            <div className={styles.statContent}>
              <span className={styles.statValue}>{(chapterCount + volumeChapterCount).toLocaleString()}</span>
              <span className={styles.statLabel}>Нийт Бүлэг</span>
              <span className={styles.statDetail}>{chapterCount} энгийн • {volumeChapterCount} volume</span>
            </div>
          </div>

          <div className={`${styles.statCard} ${styles.statSuccess}`}>
            <div className={styles.statIcon}>👥</div>
            <div className={styles.statContent}>
              <span className={styles.statValue}>{userCount.toLocaleString()}</span>
              <span className={styles.statLabel}>Хэрэглэгчид</span>
              <span className={styles.statChange}>+{newUsersToday} өнөөдөр</span>
            </div>
          </div>

          <div className={`${styles.statCard} ${styles.statWarning}`}>
            <div className={styles.statIcon}>💬</div>
            <div className={styles.statContent}>
              <span className={styles.statValue}>{commentCount.toLocaleString()}</span>
              <span className={styles.statLabel}>Сэтгэгдэл</span>
              <span className={styles.statChange}>+{newCommentsToday} өнөөдөр</span>
            </div>
          </div>

          <div className={`${styles.statCard} ${styles.statInfo}`}>
            <div className={styles.statIcon}>⭐</div>
            <div className={styles.statContent}>
              <span className={styles.statValue}>{reviewCount.toLocaleString()}</span>
              <span className={styles.statLabel}>Үнэлгээ</span>
              <span className={styles.statChange}>+{newReviewsToday} өнөөдөр</span>
            </div>
          </div>

          <div className={`${styles.statCard} ${styles.statDanger}`}>
            <div className={styles.statIcon}>📊</div>
            <div className={styles.statContent}>
              <span className={styles.statValue}>{totalViews.toLocaleString()}</span>
              <span className={styles.statLabel}>Нийт Үзэлт</span>
              <span className={styles.statDetail}>{avgViewsPerChapter} дундаж/бүлэг</span>
            </div>
          </div>
        </div>
      </section>

      {/* Content Distribution */}
      <div className={styles.twoColumnGrid}>
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Контентийн хуваарилалт</h2>
          <div className={styles.distributionGrid}>
            <div className={styles.distCard}>
              <h3>📚 Novels</h3>
              <div className={styles.distBar}>
                <div className={styles.distProgress} style={{ width: `${ongoingNovels / Math.max(novelCount, 1) * 100}%`, background: "var(--success)" }}></div>
              </div>
              <div className={styles.distStats}>
                <span><span className={styles.dot} style={{ background: "var(--success)" }}></span>Үргэлжилж буй: {ongoingNovels}</span>
                <span><span className={styles.dot} style={{ background: "var(--primary)" }}></span>Дууссан: {completedNovels}</span>
                <span><span className={styles.dot} style={{ background: "var(--error)" }}></span>Зогссон: {droppedNovels}</span>
              </div>
            </div>

            <div className={styles.distCard}>
              <h3>👥 Хэрэглэгчдийн эрх</h3>
              <div className={styles.distBar}>
                <div className={styles.distProgress} style={{ width: `${regularUserCount / Math.max(userCount, 1) * 100}%`, background: "var(--primary)" }}></div>
              </div>
              <div className={styles.distStats}>
                <span><span className={styles.dot} style={{ background: "var(--error)" }}></span>Админ: {adminCount}</span>
                <span><span className={styles.dot} style={{ background: "var(--warning)" }}></span>Модератор: {moderatorCount}</span>
                <span><span className={styles.dot} style={{ background: "var(--primary)" }}></span>Хэрэглэгч: {regularUserCount}</span>
                <span><span className={styles.dot} style={{ background: "var(--error)" }}></span>Хязгаарлагдсан: {restrictedUsers}</span>
              </div>
            </div>

            <div className={styles.distCard}>
              <h3>📖 Контент</h3>
              <div className={styles.contentBreakdown}>
                <div className={styles.breakdownItem}>
                  <span>📦 Volumes</span>
                  <span>{volumeCount}</span>
                </div>
                <div className={styles.breakdownItem}>
                  <span>📄 Volume бүлэг</span>
                  <span>{volumeChapterCount}</span>
                </div>
                <div className={styles.breakdownItem}>
                  <span>📝 Энгийн бүлэг</span>
                  <span>{chapterCount}</span>
                </div>
                <div className={styles.breakdownItem}>
                  <span>⏳ Товлосон</span>
                  <span>{scheduledChapters}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Идэвхжил</h2>
          <div className={styles.activityGrid}>
            <div className={styles.miniStat}>
              <span className={styles.miniValue}>{readingProgressCount.toLocaleString()}</span>
              <span className={styles.miniLabel}>Унших явц</span>
            </div>
            <div className={styles.miniStat}>
              <span className={styles.miniValue}>{savedNovelCount.toLocaleString()}</span>
              <span className={styles.miniLabel}>Хадгалсан</span>
            </div>
            <div className={styles.miniStat}>
              <span className={styles.miniValue}>{(totalCommentLikes + totalReviewLikes).toLocaleString()}</span>
              <span className={styles.miniLabel}>Like-ууд</span>
            </div>
            <div className={styles.miniStat}>
              <span className={styles.miniValue}>{totalReplies.toLocaleString()}</span>
              <span className={styles.miniLabel}>Хариултууд</span>
            </div>
            <div className={styles.miniStat}>
              <span className={styles.miniValue}>{pinnedComments}</span>
              <span className={styles.miniLabel}>Pinned</span>
            </div>
            <div className={styles.miniStat}>
              <span className={styles.miniValue}>{notificationCount.toLocaleString()}</span>
              <span className={styles.miniLabel}>Мэдэгдлүүд</span>
            </div>
          </div>
        </section>
      </div>

      {/* Reports & Growth Section */}
      <div className={styles.twoColumnGrid}>
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Мэдээллүүд</h2>
          <div className={styles.reportCard}>
            <div className={styles.reportHeader}>
              <span className={styles.reportTotal}>{reportCount.toLocaleString()}</span>
              <span className={styles.reportLabel}>Нийт мэдээлэл</span>
            </div>
            <div className={styles.reportBreakdown}>
              <div className={styles.reportItem}>
                <span className={styles.reportIndicator} style={{ background: "var(--error)" }}></span>
                <span>Хүлээгдэж байна: {pendingReports}</span>
                {pendingReports > 0 && <span className={styles.badge}>⚠️</span>}
              </div>
              <div className={styles.reportItem}>
                <span className={styles.reportIndicator} style={{ background: "var(--success)" }}></span>
                <span>Шийдвэрлэгдсэн: {resolvedReports}</span>
              </div>
              <div className={styles.reportItem}>
                <span className={styles.reportIndicator} style={{ background: "var(--primary)" }}></span>
                <span>Өнөөдөр: {reportsToday}</span>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Өсөлт</h2>
          <div className={styles.growthGrid}>
            <div className={styles.growthCard}>
              <div className={styles.growthHeader}>
                <span className={styles.growthTitle}>Хэрэглэгчид</span>
                <span className={styles.growthRate}>+{userGrowthRate}%</span>
              </div>
              <div className={styles.growthPeriods}>
                <div className={styles.period}>
                  <span className={styles.periodLabel}>Өнөөдөр</span>
                  <span className={styles.periodValue}>+{newUsersToday}</span>
                </div>
                <div className={styles.period}>
                  <span className={styles.periodLabel}>7 хоног</span>
                  <span className={styles.periodValue}>+{newUsersThisWeek}</span>
                </div>
                <div className={styles.period}>
                  <span className={styles.periodLabel}>30 хоног</span>
                  <span className={styles.periodValue}>+{newUsersThisMonth}</span>
                </div>
              </div>
            </div>
            <div className={styles.growthCard}>
              <div className={styles.growthHeader}>
                <span className={styles.growthTitle}>Оролцоо</span>
                <span className={styles.growthRate}>{engagementRate}%</span>
              </div>
              <p className={styles.growthDesc}>Хэрэглэгч бүр дундаж {Math.round((commentCount + reviewCount) / Math.max(userCount, 1) * 10) / 10} үйлдэл хийсэн</p>
            </div>
          </div>
        </section>
      </div>

      {/* Recent Activity */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Сүүлийн үйлдлүүд</h2>
        <div className={styles.twoColumnGrid}>
          <div className={styles.activityPanel}>
            <h3>🆕 Шинэ хэрэглэгчид</h3>
            <div className={styles.activityList}>
              {recentUsers.map((user) => (
                <div key={user.id} className={styles.activityItem}>
                  <div className={styles.activityAvatar}>{user.username[0].toUpperCase()}</div>
                  <div className={styles.activityInfo}>
                    <span className={styles.activityName}>{user.username}</span>
                    <span className={styles.activityTime}>
                      {new Date(user.createdAt).toLocaleString("mn-MN")}
                    </span>
                  </div>
                </div>
              ))}
              {recentUsers.length === 0 && (
                <p className={styles.emptyState}>Шинэ хэрэглэгч алга</p>
              )}
            </div>
          </div>

          <div className={styles.activityPanel}>
            <h3>💬 Сүүлийн сэтгэгдлүүд</h3>
            <div className={styles.activityList}>
              {recentComments.map((comment) => (
                <div key={comment.id} className={styles.activityItem}>
                  <div className={styles.activityAvatar}>{comment.user.username[0].toUpperCase()}</div>
                  <div className={styles.activityInfo}>
                    <span className={styles.activityName}>{comment.user.username}</span>
                    <span className={styles.activityPreview}>
                      {comment.content.slice(0, 50)}{comment.content.length > 50 ? "..." : ""}
                    </span>
                    <span className={styles.activityTime}>
                      {new Date(comment.createdAt).toLocaleString("mn-MN")}
                    </span>
                  </div>
                </div>
              ))}
              {recentComments.length === 0 && (
                <p className={styles.emptyState}>Сэтгэгдэл алга</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Top Content by Views */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>🔥 Хамгийн их уншигдсан (Views)</h2>
        <div className={styles.topContentGrid}>
          {topNovelsByViews.map((novel, index) => (
            <div key={novel.id} className={styles.topContentCard}>
              <div className={`${styles.topRank} ${styles.topRankViews}`}>#{index + 1}</div>
              <div className={styles.topInfo}>
                <h4 className={styles.topTitle}>{novel.title}</h4>
                <div className={styles.topStats}>
                  <span className={styles.topStatHighlight}>👁️ {novel.totalViews.toLocaleString()}</span>
                  <span>⭐ {novel.avgRating}</span>
                  <span>💬 {novel._count.reviews}</span>
                </div>
              </div>
            </div>
          ))}
          {topNovelsByViews.length === 0 && (
            <p className={styles.emptyState}>Novels алга</p>
          )}
        </div>
      </section>

      {/* Top Content by Rating */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>⭐ Хамгийн өндөр үнэлгээтэй (Rating)</h2>
        <div className={styles.topContentGrid}>
          {topNovelsByRating.map((novel, index) => (
            <div key={novel.id} className={styles.topContentCard}>
              <div className={`${styles.topRank} ${styles.topRankRating}`}>#{index + 1}</div>
              <div className={styles.topInfo}>
                <h4 className={styles.topTitle}>{novel.title}</h4>
                <div className={styles.topStats}>
                  <span className={styles.topStatHighlight}>⭐ {novel.avgRating}/10</span>
                  <span>👁️ {novel.totalViews.toLocaleString()}</span>
                  <span>💬 {novel.reviewCount} үнэлгээ</span>
                </div>
              </div>
            </div>
          ))}
          {topNovelsByRating.length === 0 && (
            <p className={styles.emptyState}>Хангалттай үнэлгээтэй novels алга (хамгийн багадаа 3 үнэлгээ шаардлагатай)</p>
          )}
        </div>
      </section>
    </div>
  );
}