import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { getNovelViewCounts } from "@/lib/views";
import { getSiteSettings } from "@/lib/siteSettings";
import NovelCarousel from "@/components/ui/NovelCarousel";
import ContinueReading from "@/components/ui/ContinueReading";
import RecentlyAddedChapters from "@/components/ui/RecentlyAddedChapters";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await auth();
  const settings = getSiteSettings();

  const [novels, viewCounts] = await Promise.all([
    db.webnovel.findMany({
      where: { hidden: false },
      orderBy: { createdAt: "desc" },
    }),
    getNovelViewCounts(),
  ]);

  const novelsWithViews = novels.map((novel) => ({
    ...novel,
    totalViews: viewCounts.get(novel.id) || 0,
  }));

  const mostViewedNovels = [...novelsWithViews]
    .sort((a, b) => b.totalViews - a.totalViews)
    .slice(0, 10);

  let continueReading: Array<{
    novel: { id: string; title: string; slug: string; thumbnail: string; novelType: string };
    chapter?: { id: string; chapterNumber: number; title: string } | null;
    volumeChapter?: { id: string; chapterNumber: number; title: string } | null;
    volume?: { id: string; title: string } | null;
    chapterNumber: number;
    isVolumeChapter: boolean;
    volumeId?: string | null;
  }> = [];
  
  if (session?.user?.id) {
    const rawData = await db.readingProgress.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
      take: 3,
      include: {
        novel: {
          select: { id: true, title: true, slug: true, thumbnail: true, novelType: true },
        },
        chapter: {
          select: { id: true, chapterNumber: true, title: true },
        },
        volumeChapter: {
          include: {
            volume: {
              select: { id: true, title: true },
            },
          },
        },
      },
    });
    continueReading = rawData.map(item => ({
      novel: item.novel,
      chapter: item.chapter,
      volumeChapter: item.volumeChapter,
      volume: item.volumeChapter?.volume || null,
      chapterNumber: item.chapterNumber,
      isVolumeChapter: item.isVolumeChapter,
      volumeId: item.volumeId,
    }));
  }

  const [recentChapters, recentVolumeChapters] = await Promise.all([
    db.chapter.findMany({
      orderBy: { createdAt: "desc" },
      take: 15,
      include: {
        novel: {
          select: { id: true, title: true, slug: true, thumbnail: true, novelType: true, hidden: true },
        },
      },
    }),
    db.volumeChapter.findMany({
      orderBy: { createdAt: "desc" },
      take: 15,
      include: {
        volume: {
          select: { 
            id: true, 
            volumeNumber: true, 
            title: true,
            novel: {
              select: { id: true, title: true, slug: true, thumbnail: true, novelType: true, hidden: true },
            },
          },
        },
      },
    }),
  ]);

  const allRecentChapters = [
    ...recentChapters.filter(ch => !ch.novel.hidden).map(ch => ({
      ...ch,
      isVolumeChapter: false,
      volume: null,
    })),
    ...recentVolumeChapters.filter(vch => !vch.volume.novel.hidden).map(vch => ({
      id: vch.id,
      chapterNumber: vch.chapterNumber,
      title: vch.title,
      content: vch.content,
      createdAt: vch.createdAt,
      updatedAt: vch.updatedAt,
      viewCount: vch.viewCount,
      isVolumeChapter: true,
      volume: vch.volume,
      novel: vch.volume.novel,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 15);

  return (
    <>
      {settings.heroMediaUrl && settings.heroMediaType && (
        <div className={styles.heroSection}>
          {settings.heroMediaType === "video" ? (
            <video
              src={settings.heroMediaUrl}
              autoPlay
              muted
              loop
              playsInline
              className={styles.heroMedia}
            />
          ) : (
            <img
              src={settings.heroMediaUrl}
              alt="Hero"
              className={styles.heroMedia}
            />
          )}
        </div>
      )}
      <div className={styles.container}>
        {continueReading.length > 0 && <ContinueReading data={continueReading} />}
        {mostViewedNovels.length > 0 && (
          <NovelCarousel title="Хамгийн их үзсэн" novels={mostViewedNovels} viewMoreHref="/novels?filter=most-viewed" />
        )}
        <section id="recommended-novels-section" className={styles.recommendedNovelsSection}>
          <NovelCarousel title="Санал болгох" novels={novelsWithViews} viewMoreHref="/novels?filter=recommended" />
        </section>
        <RecentlyAddedChapters chapters={allRecentChapters} />
      </div>
    </>
  );
}