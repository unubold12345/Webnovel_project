import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import CommentSection from "@/components/ui/CommentSection";
import ReviewsSection from "@/components/ui/ReviewsSection";
import NovelDetailsClient from "./NovelDetailsClient";
import SaveNovelButton from "./SaveNovelButton";
import { getVolumeRemainingCost } from "@/lib/volume-remaining-cost";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function NovelDetailsPage({ params }: PageProps) {
  const { slug } = await params;
  const session = await auth();

  const novel = await db.webnovel.findUnique({
    where: { slug },
    include: {
      publisher: {
        select: { id: true, username: true },
      },
      chapters: {
        orderBy: { chapterNumber: "asc" },
        select: { id: true, chapterNumber: true, title: true, viewCount: true, isPaid: true, coinCost: true },
      },
      volumes: {
        orderBy: { volumeNumber: "asc" },
        include: {
          chapters: {
            orderBy: { chapterNumber: "asc" },
            select: { id: true, chapterNumber: true, title: true, viewCount: true, isPaid: true, coinCost: true },
          },
        },
      },
      scheduledChapters: {
        orderBy: { chapterNumber: "asc" },
        select: { id: true, chapterNumber: true, title: true, scheduledFor: true },
      },
    },
  });

  if (!novel) {
    redirect("/");
  }

  const isLightNovel = novel.novelType === "light_novel";
  
  const regularChapterViews = novel.chapters.reduce((sum, ch) => sum + ch.viewCount, 0);
  const volumeChapterViews = novel.volumes.reduce((sum, vol) => {
    return sum + vol.chapters.reduce((volSum, ch) => volSum + ch.viewCount, 0);
  }, 0);
  const totalViews = regularChapterViews + volumeChapterViews;

  const firstChapter = novel.chapters[0];
  const firstVolume = novel.volumes[0];
  const firstVolumeChapter = firstVolume?.chapters[0];
  const latestChapter = novel.chapters[novel.chapters.length - 1];
  const uploadedChapters = novel.chapters.length;
  const uploadedVolumes = novel.volumes.length;

  const translationProgress = isLightNovel
    ? (novel.totalVolumes > 0 ? Math.round((uploadedVolumes / novel.totalVolumes) * 100) : 0)
    : (novel.totalChapters > 0 ? Math.round((uploadedChapters / novel.totalChapters) * 100) : 0);

  const isAdmin = session?.user?.role === "admin";
  const isModerator = session?.user?.role === "moderator";

  // Fetch unlocked chapters for current user
  const unlockedChapterIds = session?.user?.id
    ? await db.unlockedChapter.findMany({
        where: { userId: session.user.id },
        select: { chapterId: true, volumeChapterId: true },
      })
    : [];

  const unlockedRegular = new Set(unlockedChapterIds.map((u) => u.chapterId).filter((id): id is string => !!id));
  const unlockedVolume = new Set(unlockedChapterIds.map((u) => u.volumeChapterId).filter((id): id is string => !!id));

  // Fetch unlocked volumes for current user
  const unlockedVolumeIds = session?.user?.id
    ? await db.unlockedVolume.findMany({
        where: { userId: session.user.id },
        select: { volumeId: true },
      })
    : [];
  const unlockedVolumes = new Set(unlockedVolumeIds.map((u) => u.volumeId));

  // Calculate remaining costs for paid volumes
  const volumeRemainingCosts: Record<string, number> = {};
  if (session?.user?.id) {
    for (const volume of novel.volumes) {
      if (volume.isPaid) {
        volumeRemainingCosts[volume.id] = await getVolumeRemainingCost(
          session.user.id,
          volume.id,
          volume.coinCost
        );
      }
    }
  }

  // Format volumes for client (including chapters)
  const clientVolumes = novel.volumes.map((v) => ({
    id: v.id,
    volumeNumber: v.volumeNumber,
    title: v.title,
    thumbnail: v.thumbnail,
    isPaid: v.isPaid,
    coinCost: v.coinCost,
    chapters: v.chapters,
  }));

  // Fetch reviews for this novel
  const reviews = await db.review.findMany({
    where: { novelId: novel.id },
    orderBy: { createdAt: "desc" },
    take: 3,
    include: {
      user: {
        select: {
          id: true,
          username: true,
          avatar: true,
          role: true,
        },
      },
      likes: session?.user?.id
        ? {
            where: { userId: session.user.id },
            select: { type: true },
          }
        : false,
    },
  });

  // Format reviews
  const formattedReviews = reviews.map((review) => ({
    ...review,
    userLike: review.likes?.[0] || null,
  }));

  // Calculate review stats
  const totalReviews = await db.review.count({
    where: { novelId: novel.id },
  });

  const averageRating = totalReviews > 0
    ? (await db.review.aggregate({
        where: { novelId: novel.id },
        _avg: { rating: true },
      }))._avg.rating || 0
    : 0;

  // Check if current user has already reviewed
  const currentUserHasReviewed = session?.user?.id
    ? reviews.some((r) => r.userId === session.user.id)
    : false;

  return (
    <div className={styles.container}>
      <nav className={styles.breadcrumb}>
        <Link href="/" className={styles.breadcrumbLink}>Нүүр</Link>
        <span className={styles.breadcrumbSeparator}>/</span>
        <span className={styles.breadcrumbCurrent}>{novel.title}</span>
      </nav>
      <div className={styles.header}>
        <div className={styles.thumbnailWrapper}>
          {novel.thumbnail ? (
            <Image
              src={novel.thumbnail}
              alt={novel.title}
              fill
              className={styles.thumbnail}
            />
          ) : (
            <div className={styles.placeholder}>{novel.title.charAt(0)}</div>
          )}
        </div>
        <div className={styles.info}>
          <h1 className={styles.title}>{novel.title}</h1>
          <p className={styles.author}>Зохиолч: {novel.author}</p>
          {novel.translator && (
            <p className={styles.translator}>Орчуулагч: {novel.translator}</p>
          )}
          {novel.genres && (
            <div className={styles.genres}>
              {novel.genres.split(",").map((g) => g.trim()).filter(Boolean).map((genre, i) => (
                <span key={i} className={styles.genreBadge}>{genre}</span>
              ))}
            </div>
          )}
          <div className={styles.stats}>
            <div className={styles.stat}>
              <span className={styles.statLabel}>Төлөв</span>
              <span
                className={`${styles.badge} ${
                  novel.status === "ongoing" ? styles.ongoing : styles.completed
                }`}
              >
                {novel.status === "ongoing" ? "Үргэлжилж буй" : "Дууссан"}
              </span>
            </div>
            {isLightNovel ? (
              <div className={styles.stat}>
                <span className={styles.statLabel}>Боть</span>
                <span className={styles.statValue}>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
                  </svg>
                  {novel.totalVolumes}
                </span>
              </div>
            ) : (
              <div className={styles.stat}>
                <span className={styles.statLabel}>Бүлэг</span>
                <span className={styles.statValue}>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
                  </svg>
                  {novel.totalChapters}{novel.status !== "completed" ? "+" : ""}
                </span>
              </div>
            )}
            <div className={styles.stat}>
              <span className={styles.statLabel}>Үзэлт</span>
              <span className={styles.statValue}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                {totalViews}
              </span>
            </div>
            {!novel.publisherId && (
              <div className={styles.stat}>
                <span className={styles.statLabel}>Орчуулга</span>
                {novel.translationStatus === "ongoing" ? (
                  <div className={styles.progressContainer}>
                    <div className={styles.progressBar}>
                      <div 
                        className={styles.progressFill} 
                        style={{ width: `${translationProgress}%` }}
                      />
                    </div>
                    <span className={styles.progressText}>
                      {isLightNovel
                        ? `${uploadedVolumes}/${novel.totalVolumes}`
                        : `${uploadedChapters}/${novel.totalChapters}${novel.status !== "completed" ? "+" : ""}`}
                    </span>
                  </div>
                ) : (
                  <span
                    className={`${styles.badge} ${styles.completed}`}
                  >
                    {novel.translationStatus}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className={styles.actions}>
            {isLightNovel && firstVolume && firstVolumeChapter ? (
              <Link
                href={`/novels/${novel.slug}/volumes/${firstVolume.volumeNumber}/chapters/${firstVolumeChapter.chapterNumber}`}
                className={styles.readButton}
              >
                Унших
              </Link>
            ) : !isLightNovel && firstChapter ? (
              <Link
                href={`/novels/${novel.slug}/chapters/${firstChapter.chapterNumber}`}
                className={styles.readButton}
              >
                Унших
              </Link>
            ) : null}
            <SaveNovelButton novelId={novel.id} />
            {isAdmin && (
              <Link
                href={`/admin/novels/${novel.id}/edit`}
                className={styles.editButton}
              >
                Засах
              </Link>
            )}
          </div>
        </div>
      </div>
      <div className={styles.summary}>
        <h2>Товч агуулга</h2>
        <p>{novel.summary}</p>
      </div>
      <NovelDetailsClient
        novelId={novel.id}
        novelSlug={novel.slug}
        novelType={novel.novelType}
        chapters={novel.chapters}
        scheduledChapters={novel.scheduledChapters}
        volumes={clientVolumes}
        isAdmin={isAdmin}
        isModerator={isModerator}
        unlockedRegular={unlockedRegular}
        unlockedVolume={unlockedVolume}
        unlockedVolumes={unlockedVolumes}
        volumeRemainingCosts={volumeRemainingCosts}
        isLoggedIn={!!session?.user?.id}
      />
      <ReviewsSection
        novelId={novel.id}
        novelSlug={novel.slug}
        novelTitle={novel.title}
        reviews={formattedReviews}
        totalReviews={totalReviews}
        averageRating={averageRating}
        currentUserId={session?.user?.id}
        currentUserRole={session?.user?.role}
        currentUserHasReviewed={currentUserHasReviewed}
      />
      <CommentSection novelId={novel.id} />
    </div>
  );
}
