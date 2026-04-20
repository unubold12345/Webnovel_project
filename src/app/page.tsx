import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { getNovelViewCounts } from "@/lib/views";
import WebnovelCard from "@/components/ui/WebnovelCard";
import ContinueReading from "@/components/ui/ContinueReading";
import RecentlyAddedChapters from "@/components/ui/RecentlyAddedChapters";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await auth();

  const [novels, viewCounts] = await Promise.all([
    db.webnovel.findMany({
      orderBy: { createdAt: "desc" },
    }),
    getNovelViewCounts(),
  ]);

  const novelsWithViews = novels.map((novel) => ({
    ...novel,
    totalViews: viewCounts.get(novel.id) || 0,
  }));

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

  // Fetch recently added chapters (both regular and volume chapters)
  const [recentChapters, recentVolumeChapters] = await Promise.all([
    db.chapter.findMany({
      orderBy: { createdAt: "desc" },
      take: 15,
      include: {
        novel: {
          select: { id: true, title: true, slug: true, thumbnail: true, novelType: true },
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
              select: { id: true, title: true, slug: true, thumbnail: true, novelType: true },
            },
          },
        },
      },
    }),
  ]);

  // Combine and sort all chapters
  const allRecentChapters = [
    ...recentChapters.map(ch => ({
      ...ch,
      isVolumeChapter: false,
      volume: null,
    })),
    ...recentVolumeChapters.map(vch => ({
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
    <div className={styles.container}>
      {continueReading.length > 0 && <ContinueReading data={continueReading} />}
      <h1 className={styles.title}>
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
        </svg>
        Санал болгох
      </h1>
      <div className={styles.grid}>
        {novelsWithViews.length > 0 ? (
          novelsWithViews.map((novel) => <WebnovelCard key={novel.id} novel={novel} />)
        ) : (
          <p className={styles.empty}>Одоогоор вебньюэл байхгүй байна.</p>
        )}
      </div>
      <RecentlyAddedChapters chapters={allRecentChapters} />
    </div>
  );
}
