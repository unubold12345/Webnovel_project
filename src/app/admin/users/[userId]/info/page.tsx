import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import PaginatedWrapper from "@/app/admin/components/PaginatedWrapper";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

function formatDate(date: Date | string) {
  return new Date(date).toLocaleString("mn-MN", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

function formatDateShort(date: Date | string) {
  return new Date(date).toLocaleDateString("mn-MN");
}

function formatNumber(n: number) {
  return n.toLocaleString("mn-MN");
}

function timeAgo(date: Date | string) {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Дөнгөж сая";
  if (diffMins < 60) return `${diffMins} минутын өмнө`;
  if (diffHours < 24) return `${diffHours} цагийн өмнө`;
  if (diffDays < 7) return `${diffDays} хоногийн өмнө`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} долоо хоногийн өмнө`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} сарын өмнө`;
  return `${Math.floor(diffDays / 365)} жилийн өмнө`;
}

async function getUserInfo(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      comments: {
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          novel: { select: { id: true, title: true, slug: true } },
          chapter: { select: { id: true, chapterNumber: true, title: true } },
          volume: { select: { id: true, volumeNumber: true, title: true } },
          likes: { select: { id: true, type: true, userId: true } },
        },
      },
      reviews: {
        orderBy: { createdAt: "desc" },
        include: {
          novel: { select: { id: true, title: true, slug: true } },
          likes: { select: { id: true, type: true } },
        },
      },
      savedNovels: {
        orderBy: { createdAt: "desc" },
        include: {
          novel: { select: { id: true, title: true, slug: true, thumbnail: true, author: true, status: true } },
        },
      },
      readingProgress: {
        orderBy: { updatedAt: "desc" },
        take: 50,
        include: {
          novel: { select: { id: true, title: true, slug: true } },
          chapter: { select: { chapterNumber: true, title: true } },
          volumeChapter: { select: { chapterNumber: true, title: true } },
        },
      },
      unlockedChapters: {
        orderBy: { createdAt: "desc" },
        include: {
          chapter: { select: { chapterNumber: true, title: true, novelId: true, novel: { select: { title: true, slug: true } } } },
          volumeChapter: { select: { chapterNumber: true, title: true, volume: { select: { novelId: true, novel: { select: { title: true, slug: true } } } } } },
        },
      },
      coinHistory: {
        orderBy: { createdAt: "desc" },
        include: {
          novel: { select: { id: true, title: true, slug: true } },
          chapter: { select: { chapterNumber: true, title: true } },
          volumeChapter: { select: { chapterNumber: true, title: true } },
        },
      },
      subscriptionHistory: {
        orderBy: { createdAt: "desc" },
      },
      publishedNovels: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true, title: true, slug: true, author: true, novelType: true,
          status: true, hidden: true, totalChapters: true, totalVolumes: true,
          createdAt: true, _count: { select: { chapters: true, reviews: true, savedNovels: true } },
        },
      },
      reports: {
        orderBy: { createdAt: "desc" },
        include: {
          chapter: { select: { title: true, novel: { select: { title: true } } } },
          volumeChapter: { select: { title: true, volume: { select: { novel: { select: { title: true } } } } } },
          comment: { select: { content: true } },
          review: { select: { content: true, novel: { select: { title: true } } } },
        },
      },
      commentLikes: {
        orderBy: { createdAt: "desc" },
        take: 30,
        include: {
          comment: { select: { id: true, content: true, novelId: true, novel: { select: { title: true, slug: true } } } },
        },
      },
      notifications: {
        orderBy: { createdAt: "desc" },
        take: 30,
      },
      activityLogs: {
        orderBy: { createdAt: "desc" },
        take: 50,
      },
      _count: {
        select: {
          comments: true, reviews: true, savedNovels: true,
          readingProgress: true, unlockedChapters: true, coinHistory: true,
          subscriptionHistory: true, publishedNovels: true, reports: true,
          commentLikes: true, notifications: true, activityLogs: true,
        },
      },
    },
  });

  if (!user) return null;

  // Reports against this user's content
  const commentIds = user.comments.map((c) => c.id);
  const reviewIds = user.reviews.map((r) => r.id);

  const reportsAgainst = await db.report.findMany({
    where: {
      OR: [
        { commentId: { in: commentIds } },
        { reviewId: { in: reviewIds } },
      ],
    },
    orderBy: { createdAt: "desc" },
    include: {
      reporter: { select: { id: true, username: true } },
      comment: { select: { content: true } },
      review: { select: { content: true } },
    },
  });

  // Calculate stats
  const totalTopup = user.coinHistory
    .filter((ch) => ch.type === "topup")
    .reduce((sum, ch) => sum + ch.amount, 0);
  const totalSpent = user.coinHistory
    .filter((ch) => ch.type === "unlock")
    .reduce((sum, ch) => sum + Math.abs(ch.amount), 0);
  const totalRefunded = user.coinHistory
    .filter((ch) => ch.type === "refund")
    .reduce((sum, ch) => sum + Math.abs(ch.amount), 0);

  const averageRating = user.reviews.length > 0
    ? user.reviews.reduce((sum, r) => sum + r.rating, 0) / user.reviews.length
    : 0;

  return {
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      isRestricted: user.isRestricted,
      coins: user.coins,
      avatar: user.avatar,
      bio: user.bio,
      emailVerified: user.emailVerified,
      subscriptionPlan: user.subscriptionPlan,
      subscriptionExpiresAt: user.subscriptionExpiresAt,
      lastActiveAt: user.lastActiveAt,
      acceptedTermsAt: user.acceptedTermsAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
    stats: {
      totalComments: user._count.comments,
      totalReviews: user._count.reviews,
      totalSaves: user._count.savedNovels,
      totalReadingProgress: user._count.readingProgress,
      totalUnlocked: user._count.unlockedChapters,
      totalCoinTransactions: user._count.coinHistory,
      totalSubscriptions: user._count.subscriptionHistory,
      totalPublished: user._count.publishedNovels,
      totalReportsFiled: user._count.reports,
      totalReportsAgainst: reportsAgainst.length,
      totalNotifications: user._count.notifications,
      totalTopup,
      totalSpent,
      totalRefunded,
      netCoins: totalTopup - totalSpent + totalRefunded,
      averageRating: Math.round(averageRating * 10) / 10,
    },
    comments: user.comments,
    reviews: user.reviews,
    savedNovels: user.savedNovels,
    readingProgress: user.readingProgress,
    unlockedChapters: user.unlockedChapters,
    coinHistory: user.coinHistory,
    subscriptionHistory: user.subscriptionHistory,
    publishedNovels: user.publishedNovels,
    reportsFiled: user.reports,
    reportsAgainst,
    commentLikes: user.commentLikes,
    notifications: user.notifications,
    activityLogs: user.activityLogs,
  };
}

export default async function UserInfoPage({
  params,
}: {
  params: Promise<{ userId: string }>;
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

  const { userId } = await params;
  const data = await getUserInfo(userId);
  if (!data) notFound();

  const { user, stats, comments, reviews, savedNovels, readingProgress, unlockedChapters, coinHistory, subscriptionHistory, publishedNovels, reportsFiled, reportsAgainst, commentLikes, notifications, activityLogs } = data;

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Link href="/admin/users" className={styles.backLink}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
            Буцах
          </Link>
          <h1 className={styles.title}>{user.username}</h1>
          <div className={styles.headerBadges}>
            <span className={`${styles.roleBadge} ${styles[user.role]}`}>
              {user.role === "admin" ? "Админ" : user.role === "moderator" ? "Зохицуулагч" : "Хэрэглэгч"}
            </span>
            {user.isRestricted && <span className={styles.restrictedBadge}>Хязгаарлагдсан</span>}
            {user.emailVerified && <span className={styles.verifiedBadge}>Баталгаажсан</span>}
            {user.subscriptionPlan && user.subscriptionExpiresAt && new Date(user.subscriptionExpiresAt) > new Date() && (
              <span className={`${styles.planBadge} ${user.subscriptionPlan === "medium" ? styles.mediumPlan : styles.simplePlan}`}>
                {user.subscriptionPlan === "simple" ? "Simple" : "Medium"}
              </span>
            )}
          </div>
        </div>
        <div className={styles.headerActions}>
          <Link href={`/user/${userId}`} className={styles.actionBtn} target="_blank">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            Профайл харах
          </Link>
        </div>
      </div>

      {/* Hero */}
      <div className={styles.hero}>
        {user.avatar ? (
          <div className={styles.avatarWrap}>
            <Image src={user.avatar} alt={user.username} fill className={styles.avatar} sizes="120px" />
          </div>
        ) : (
          <div className={styles.avatarPlaceholder}>{user.username.charAt(0)?.toUpperCase()}</div>
        )}
        <div className={styles.heroInfo}>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>ID</span>
              <span className={styles.infoValueMono}>{user.id}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Имэйл</span>
              <span className={styles.infoValue}>{user.email}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Coin</span>
              <span className={styles.infoValue}>{formatNumber(user.coins)}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Баталгаажсал</span>
              <span className={styles.infoValue}>{user.emailVerified ? "Тийм" : "Үгүй"}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Байгаа coin</span>
              <span className={styles.infoValue}>{formatNumber(user.coins)}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Нийт цэнэглэсэн</span>
              <span className={styles.infoValue}>{formatNumber(stats.totalTopup)}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Нийт зарцуулсан</span>
              <span className={styles.infoValue}>{formatNumber(stats.totalSpent)}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Буцаалт</span>
              <span className={styles.infoValue}>{formatNumber(stats.totalRefunded)}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Сүүлд идэвхитэй</span>
              <span className={styles.infoValue}>{timeAgo(user.lastActiveAt)}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Нэгдсэн</span>
              <span className={styles.infoValue}>{formatDate(user.createdAt)}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Шинэчилсэн</span>
              <span className={styles.infoValue}>{formatDate(user.updatedAt)}</span>
            </div>
            {user.acceptedTermsAt && (
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Үйлчилгээний нөхцөл</span>
                <span className={styles.infoValue}>{formatDate(user.acceptedTermsAt)}</span>
              </div>
            )}
            {user.subscriptionExpiresAt && (
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Дуусах огноо</span>
                <span className={styles.infoValue}>{formatDate(user.subscriptionExpiresAt)}</span>
              </div>
            )}
          </div>
          {user.bio && (
            <div className={styles.bioBox}>
              <span className={styles.bioLabel}>Танилцуулга</span>
              <p className={styles.bioText}>{user.bio}</p>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Статистик</h2>
        <div className={styles.statsGrid}>
          <div className={styles.statCard}><span className={styles.statCardValue}>{formatNumber(stats.totalComments)}</span><span className={styles.statCardLabel}>Сэтгэгдэл</span></div>
          <div className={styles.statCard}><span className={styles.statCardValue}>{formatNumber(stats.totalReviews)}</span><span className={styles.statCardLabel}>Тойм</span></div>
          <div className={styles.statCard}><span className={styles.statCardValue}>{formatNumber(stats.totalSaves)}</span><span className={styles.statCardLabel}>Хадгалсан</span></div>
          <div className={styles.statCard}><span className={styles.statCardValue}>{formatNumber(stats.totalReadingProgress)}</span><span className={styles.statCardLabel}>Уншлага</span></div>
          <div className={styles.statCard}><span className={styles.statCardValue}>{formatNumber(stats.totalUnlocked)}</span><span className={styles.statCardLabel}>Тайлсан</span></div>
          <div className={styles.statCard}><span className={styles.statCardValue}>{formatNumber(stats.totalPublished)}</span><span className={styles.statCardLabel}>Нийтлэл</span></div>
          <div className={styles.statCard}><span className={styles.statCardValue}>{formatNumber(stats.totalCoinTransactions)}</span><span className={styles.statCardLabel}>Coin гүйлгээ</span></div>
          <div className={styles.statCard}><span className={styles.statCardValue}>{stats.averageRating > 0 ? stats.averageRating.toFixed(1) : "—"}</span><span className={styles.statCardLabel}>Дундаж үнэлгээ</span></div>
          <div className={styles.statCard}><span className={styles.statCardValue}>{formatNumber(stats.totalReportsFiled)}</span><span className={styles.statCardLabel}>Гомдол илгээсэн</span></div>
          <div className={styles.statCard}><span className={styles.statCardValue}>{formatNumber(stats.totalReportsAgainst)}</span><span className={styles.statCardLabel}>Гомдол хүлээн авсан</span></div>
          <div className={styles.statCard}><span className={styles.statCardValue}>{formatNumber(stats.totalTopup)}</span><span className={styles.statCardLabel}>Цэнэглэсэн coin</span></div>
          <div className={styles.statCard}><span className={styles.statCardValue}>{formatNumber(stats.totalSpent)}</span><span className={styles.statCardLabel}>Зарцуулсан coin</span></div>
        </div>
      </div>

      {/* Published Novels */}
      {publishedNovels.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Нийтэлсэн зохиолууд<span className={styles.sectionCount}>{publishedNovels.length}</span></h2>
          <div className={styles.novelGrid}>
            <PaginatedWrapper itemsPerPage={10}>
              {publishedNovels.map((novel) => (
                <Link key={novel.id} href={`/admin/novels/${novel.id}/info`} className={styles.novelCard}>
                  <div className={styles.novelHeader}>
                    <span className={`${styles.typeBadge} ${novel.novelType === "light_novel" ? styles.typeLightNovel : styles.typeWebnovel}`}>
                      {novel.novelType === "light_novel" ? "LN" : "WN"}
                    </span>
                    {novel.hidden && <span className={styles.hiddenBadgeSmall}>Нуусан</span>}
                  </div>
                  <h3 className={styles.novelTitle}>{novel.title}</h3>
                  <p className={styles.novelAuthor}>{novel.author}</p>
                  <div className={styles.novelStats}>
                    <span>{novel._count.chapters} бүлэг</span>
                    <span>{novel._count.reviews} үнэлгээ</span>
                    <span>{novel._count.savedNovels} хадгалсан</span>
                  </div>
                </Link>
              ))}
            </PaginatedWrapper>
          </div>
        </div>
      )}

      {/* Coin History */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Coin гүйлгээ
          <span className={styles.sectionCount}>{formatNumber(stats.totalTopup)} цэнэг / {formatNumber(stats.totalSpent)} зарцуулалт</span>
        </h2>
        {coinHistory.length === 0 ? (
          <p className={styles.emptyText}>Coin гүйлгээ байхгүй.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.dataTable}>
              <thead><tr><th>Төрөл</th><th>Хэмжээ</th><th>Баланс</th><th>Зохиол</th><th>Бүлэг</th><th>Тайлбар</th><th>Огноо</th></tr></thead>
              <tbody>
                <PaginatedWrapper itemsPerPage={10} tableColSpan={7}>
                  {coinHistory.map((ch) => (
                    <tr key={ch.id}>
                      <td>
                        <span className={`${styles.coinType} ${ch.type === "unlock" ? styles.coinUnlock : ch.type === "refund" ? styles.coinRefund : ch.type === "topup" ? styles.coinTopup : ch.type === "reset" ? styles.coinReset : styles.coinOther}`}>
                          {ch.type === "unlock" ? "Түгжээ тайлах" : ch.type === "refund" ? "Буцаалт" : ch.type === "topup" ? "Цэнэглэлт" : ch.type === "reset" ? "Reset" : ch.type}
                        </span>
                      </td>
                      <td className={ch.amount < 0 ? styles.negativeAmount : styles.positiveAmount}>{ch.amount > 0 ? `+${ch.amount}` : ch.amount}</td>
                      <td>{ch.balance}</td>
                      <td>{ch.novel ? <Link href={`/novels/${ch.novel.slug}`} className={styles.tableLink}>{ch.novel.title}</Link> : "—"}</td>
                      <td>{ch.chapter ? `Бүлэг ${ch.chapter.chapterNumber}` : ch.volumeChapter ? `Бүлэг ${ch.volumeChapter.chapterNumber}` : "—"}</td>
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

      {/* Subscription History */}
      {subscriptionHistory.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Эрхийн түүх<span className={styles.sectionCount}>{subscriptionHistory.length}</span></h2>
          <div className={styles.tableWrap}>
            <table className={styles.dataTable}>
              <thead><tr><th>Төлөвлөгөө</th><th>Үйлдэл</th><th>Хугацаа</th><th>Coin</th><th>Хэнээр</th><th>Огноо</th></tr></thead>
              <tbody>
                <PaginatedWrapper itemsPerPage={10} tableColSpan={6}>
                  {subscriptionHistory.map((sh) => (
                    <tr key={sh.id}>
                      <td>{sh.plan === "simple" ? "Simple" : "Medium"}</td>
                      <td>
                        <span className={`${styles.subAction} ${sh.action === "granted" ? styles.subGranted : sh.action === "revoked" ? styles.subRevoked : styles.subExpired}`}>
                          {sh.action === "granted" ? "Олгосон" : sh.action === "revoked" ? "Хүчингүй болгосон" : "Дууссан"}
                        </span>
                      </td>
                      <td>{sh.durationMinutes ? `${sh.durationMinutes} мин` : "—"}</td>
                      <td>{sh.coinsGranted ?? "—"}</td>
                      <td>{sh.grantedBy || "—"}</td>
                      <td>{formatDate(sh.createdAt)}</td>
                    </tr>
                  ))}
                </PaginatedWrapper>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Library */}
      {savedNovels.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Номын сан<span className={styles.sectionCount}>{savedNovels.length}</span></h2>
          <div className={styles.novelGrid}>
            <PaginatedWrapper itemsPerPage={10}>
              {savedNovels.map((s) => (
                <Link key={s.id} href={`/novels/${s.novel.slug}`} className={styles.novelCard} target="_blank">
                  <div className={styles.novelHeader}>
                    <span className={`${styles.statusBadgeSmall} ${s.readingStatus === "reading" ? styles.statusReading : s.readingStatus === "completed" ? styles.statusCompleted : s.readingStatus === "dropped" ? styles.statusDropped : styles.statusPlan}`}>
                      {s.readingStatus === "reading" ? "Уншиж байна" : s.readingStatus === "completed" ? "Дууссан" : s.readingStatus === "dropped" ? "Орхисон" : "Уншихаар"}
                    </span>
                  </div>
                  <h3 className={styles.novelTitle}>{s.novel.title}</h3>
                  <p className={styles.novelAuthor}>{s.novel.author}</p>
                  <p className={styles.novelMeta}>Хадгалсан: {formatDateShort(s.createdAt)}</p>
                </Link>
              ))}
            </PaginatedWrapper>
          </div>
        </div>
      )}

      {/* Reading Progress */}
      {readingProgress.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Уншлагын явц<span className={styles.sectionCount}>{readingProgress.length}</span></h2>
          <div className={styles.tableWrap}>
            <table className={styles.dataTable}>
              <thead><tr><th>Зохиол</th><th>Бүлэг</th><th>Төрөл</th><th>Шинэчилсэн</th></tr></thead>
              <tbody>
                <PaginatedWrapper itemsPerPage={10} tableColSpan={4}>
                  {readingProgress.map((rp) => (
                    <tr key={rp.id}>
                      <td><Link href={`/novels/${rp.novel.slug}`} className={styles.tableLink}>{rp.novel.title}</Link></td>
                      <td>{rp.chapterNumber}</td>
                      <td>{rp.isVolumeChapter ? "Ботийн бүлэг" : "Энгийн"}</td>
                      <td>{formatDate(rp.updatedAt)}</td>
                    </tr>
                  ))}
                </PaginatedWrapper>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Unlocked Chapters */}
      {unlockedChapters.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Тайлсан бүлгүүд<span className={styles.sectionCount}>{unlockedChapters.length}</span></h2>
          <div className={styles.tableWrap}>
            <table className={styles.dataTable}>
              <thead><tr><th>Зохиол</th><th>Бүлэг</th><th>Гарчиг</th><th>Тайлсан</th></tr></thead>
              <tbody>
                <PaginatedWrapper itemsPerPage={10} tableColSpan={4}>
                  {unlockedChapters.map((uc) => {
                    const novel = uc.chapter?.novel || uc.volumeChapter?.volume?.novel;
                    const ch = uc.chapter || uc.volumeChapter;
                    return (
                      <tr key={uc.id}>
                        <td>{novel ? <Link href={`/novels/${novel.slug}`} className={styles.tableLink}>{novel.title}</Link> : "—"}</td>
                        <td>{ch?.chapterNumber ?? "—"}</td>
                        <td>{ch?.title ?? "—"}</td>
                        <td>{formatDate(uc.createdAt)}</td>
                      </tr>
                    );
                  })}
                </PaginatedWrapper>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reviews */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Тойм<span className={styles.sectionCount}>{reviews.length}</span></h2>
        {reviews.length === 0 ? (
          <p className={styles.emptyText}>Тойм байхгүй.</p>
        ) : (
          <div className={styles.reviewList}>
            <PaginatedWrapper itemsPerPage={10}>
              {reviews.map((review) => (
                <div key={review.id} className={styles.reviewCard}>
                  <div className={styles.reviewHeader}>
                    <Link href={`/novels/${review.novel.slug}`} className={styles.tableLink}>{review.novel.title}</Link>
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

      {/* Comments */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Сэтгэгдлүүд<span className={styles.sectionCount}>{comments.length}</span></h2>
        {comments.length === 0 ? (
          <p className={styles.emptyText}>Сэтгэгдэл байхгүй.</p>
        ) : (
          <div className={styles.commentList}>
            <PaginatedWrapper itemsPerPage={10}>
              {comments.map((comment) => (
                <div key={comment.id} className={styles.commentCard}>
                  <div className={styles.commentHeader}>
                    <div className={styles.commentContext}>
                      {comment.novel && <Link href={`/novels/${comment.novel.slug}`} className={styles.tableLink}>{comment.novel.title}</Link>}
                      {comment.chapter && <span className={styles.commentChapter}>Бүлэг {comment.chapter.chapterNumber}</span>}
                      {comment.volume && <span className={styles.commentChapter}>Боть {comment.volume.volumeNumber}</span>}
                    </div>
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

      {/* Comment Likes Given */}
      {commentLikes.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Сэтгэгдэлд өгсөн үнэлгээ<span className={styles.sectionCount}>{commentLikes.length}</span></h2>
          <div className={styles.tableWrap}>
            <table className={styles.dataTable}>
              <thead><tr><th>Зохиол</th><th>Төрөл</th><th>Сэтгэгдэл</th><th>Огноо</th></tr></thead>
              <tbody>
                <PaginatedWrapper itemsPerPage={10} tableColSpan={4}>
                  {commentLikes.map((cl) => (
                    <tr key={cl.id}>
                      <td>{cl.comment?.novel ? <Link href={`/novels/${cl.comment.novel.slug}`} className={styles.tableLink}>{cl.comment.novel.title}</Link> : "—"}</td>
                      <td>{cl.type === "like" ? "👍 Like" : "👎 Dislike"}</td>
                      <td className={styles.truncateCell}>{cl.comment?.content || "—"}</td>
                      <td>{formatDate(cl.createdAt)}</td>
                    </tr>
                  ))}
                </PaginatedWrapper>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reports Filed */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Илгээсэн гомдол<span className={styles.sectionCount}>{reportsFiled.length}</span></h2>
        {reportsFiled.length === 0 ? (
          <p className={styles.emptyText}>Гомдол байхгүй.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.dataTable}>
              <thead><tr><th>Шалтгаан</th><th>Ангилал</th><th>Төлөв</th><th>Холбогдох</th><th>Огноо</th></tr></thead>
              <tbody>
                <PaginatedWrapper itemsPerPage={10} tableColSpan={5}>
                  {reportsFiled.map((report) => (
                    <tr key={report.id}>
                      <td>{report.reason}</td>
                      <td>{report.category}</td>
                      <td>
                        <span className={`${styles.reportStatus} ${report.status === "resolved" ? styles.reportResolved : report.status === "pending" ? styles.reportPending : styles.reportRejected}`}>
                          {report.status === "resolved" ? "Шийдвэрлэгдсэн" : report.status === "pending" ? "Хүлээгдэж буй" : "Татгалзсан"}
                        </span>
                      </td>
                      <td className={styles.truncateCell}>
                        {report.chapter?.novel?.title || report.volumeChapter?.volume?.novel?.title || report.comment?.content || report.review?.content || "—"}
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

      {/* Reports Against */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Хүлээн авсан гомдол<span className={styles.sectionCount}>{reportsAgainst.length}</span></h2>
        {reportsAgainst.length === 0 ? (
          <p className={styles.emptyText}>Гомдол байхгүй.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.dataTable}>
              <thead><tr><th>Мэдээлэгч</th><th>Шалтгаан</th><th>Ангилал</th><th>Төлөв</th><th>Холбогдох</th><th>Огноо</th></tr></thead>
              <tbody>
                <PaginatedWrapper itemsPerPage={10} tableColSpan={6}>
                  {reportsAgainst.map((report) => (
                    <tr key={report.id}>
                      <td><Link href={`/user/${report.reporter.id}`} className={styles.tableLink}>{report.reporter.username}</Link></td>
                      <td>{report.reason}</td>
                      <td>{report.category}</td>
                      <td>
                        <span className={`${styles.reportStatus} ${report.status === "resolved" ? styles.reportResolved : report.status === "pending" ? styles.reportPending : styles.reportRejected}`}>
                          {report.status === "resolved" ? "Шийдвэрлэгдсэн" : report.status === "pending" ? "Хүлээгдэж буй" : "Татгалзсан"}
                        </span>
                      </td>
                      <td className={styles.truncateCell}>{report.comment?.content || report.review?.content || "—"}</td>
                      <td>{formatDate(report.createdAt)}</td>
                    </tr>
                  ))}
                </PaginatedWrapper>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Notifications */}
      {notifications.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Мэдэгдлүүд<span className={styles.sectionCount}>{notifications.length}</span></h2>
          <div className={styles.commentList}>
            <PaginatedWrapper itemsPerPage={10}>
              {notifications.map((n) => (
                <div key={n.id} className={`${styles.commentCard} ${!n.isRead ? styles.unreadNotification : ""}`}>
                  <div className={styles.commentHeader}>
                    <span className={styles.infoLabel}>{n.type}</span>
                    <span className={styles.commentDate}>{formatDate(n.createdAt)}</span>
                  </div>
                  <p className={styles.commentContent}>{n.message}</p>
                  {n.link && <Link href={n.link} className={styles.tableLink}>{n.link}</Link>}
                </div>
              ))}
            </PaginatedWrapper>
          </div>
        </div>
      )}

      {/* Activity Log */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Үйл ажиллагааны түүх<span className={styles.sectionCount}>{activityLogs.length}</span></h2>
        {activityLogs.length === 0 ? (
          <div className={styles.emptyNotice}>
            <p>Одоогоор үйл ажиллагааны түүх байхгүй. Хэрэглэгчийн мэдээлэл өөрчлөгдөхөд энд бичигдэх болно.</p>
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.dataTable}>
              <thead><tr><th>Үйлдэл</th><th>Тайлбар</th><th>Хуучин утга</th><th>Шинэ утга</th><th>Хэн</th><th>Огноо</th></tr></thead>
              <tbody>
                <PaginatedWrapper itemsPerPage={10} tableColSpan={6}>
                  {activityLogs.map((log) => (
                    <tr key={log.id}>
                      <td><span className={styles.activityAction}>{log.action}</span></td>
                      <td>{log.description || "—"}</td>
                      <td className={styles.codeCell}>{log.oldValue || "—"}</td>
                      <td className={styles.codeCell}>{log.newValue || "—"}</td>
                      <td>{log.performedBy || "Систем"}</td>
                      <td>{formatDate(log.createdAt)}</td>
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
