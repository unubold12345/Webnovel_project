import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import CommentSection from "@/components/ui/CommentSection";
import ChapterListModal from "@/components/ui/ChapterListModal";
import SaveProgress from "@/components/ui/SaveProgress";
import ChapterReportButton from "@/components/ui/ChapterReportButton";
import ReaderSettings from "@/components/ui/ReaderSettings";
import LockedChapterView from "@/components/ui/LockedChapterView";
import ChapterNavLink from "@/components/ui/ChapterNavLink";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string; chapterNumber: string }>;
}

export default async function ChapterPage({ params }: PageProps) {
  const { slug, chapterNumber: chapterNum } = await params;
  const chapterNumber = parseInt(chapterNum);
  const session = await auth();

  const novel = await db.webnovel.findUnique({
    where: { slug },
    include: {
      chapters: {
        orderBy: { chapterNumber: "asc" },
        select: { id: true, chapterNumber: true, title: true, isPaid: true, coinCost: true },
      },
    },
  });

  if (!novel) {
    notFound();
  }

  const chapter = await db.chapter.findFirst({
    where: { novelId: novel.id, chapterNumber },
  });

  if (!chapter) {
    notFound();
  }

  const canManage = session?.user?.role === "admin" || session?.user?.role === "moderator";

  // Check if chapter is locked (admins and moderators can bypass)
  let isLocked = false;
  if (chapter.isPaid && !canManage) {
    if (!session?.user?.id) {
      isLocked = true;
    } else {
      const unlocked = await db.unlockedChapter.findUnique({
        where: { userId_chapterId: { userId: session.user.id, chapterId: chapter.id } },
      });
      isLocked = !unlocked;
    }
  }

  if (!isLocked) {
    await db.chapter.update({
      where: { id: chapter.id },
      data: { viewCount: { increment: 1 } },
    });
  }

  const prevChapter = novel.chapters.find(
    (c) => c.chapterNumber === chapterNumber - 1
  );
  const nextChapter = novel.chapters.find(
    (c) => c.chapterNumber === chapterNumber + 1
  );

  const userId = session?.user?.id ?? null;
  const unlockedChapterIds = userId
    ? await db.unlockedChapter.findMany({
        where: { userId },
        select: { chapterId: true, volumeChapterId: true },
      })
    : [];
  const unlockedRegular = new Set(unlockedChapterIds.map((u) => u.chapterId).filter((id): id is string => !!id));
  const unlockedVolume = new Set(unlockedChapterIds.map((u) => u.volumeChapterId).filter((id): id is string => !!id));

  return (
    <div className={styles.container} data-reader-container="true">
      <SaveProgress novelId={novel.id} chapterId={chapter.id} chapterNumber={chapterNumber} />
      <nav className={styles.breadcrumb}>
        <Link href="/" className={styles.breadcrumbLink}>Нүүр</Link>
        <span className={styles.breadcrumbSeparator}>/</span>
        <Link href={`/novels/${novel.slug}`} className={styles.breadcrumbLink}>{novel.title}</Link>
        <span className={styles.breadcrumbSeparator}>/</span>
        <span className={styles.breadcrumbCurrent}>{chapterNumber}-р бүлэг - {chapter.title}</span>
      </nav>
      <div className={styles.navigation}>
        <div className={styles.navLeft}>
          {/* Хөндлөнгийн зай */}
        </div>
        <div className={styles.navCenter}>
          <ChapterNavLink
            target={prevChapter}
            novelSlug={slug}
            direction="prev"
            unlockedRegular={unlockedRegular}
            unlockedVolume={unlockedVolume}
            userId={userId}
            canManage={canManage}
          />
          <ChapterListModal
            chapters={novel.chapters}
            currentChapter={chapterNumber}
            novelSlug={novel.slug}
            unlockedRegular={unlockedRegular}
            unlockedVolume={unlockedVolume}
            userId={userId}
            canManage={canManage}
          />
          <ChapterNavLink
            target={nextChapter}
            novelSlug={slug}
            direction="next"
            unlockedRegular={unlockedRegular}
            unlockedVolume={unlockedVolume}
            userId={userId}
            canManage={canManage}
          />
        </div>
        <div className={styles.navRight}>
          <ReaderSettings />
        </div>
      </div>
      {isLocked ? (
        <LockedChapterView
          title={`${chapterNumber}-р бүлэг: ${chapter.title}`}
          coinCost={chapter.coinCost}
          id={chapter.id}
          type="chapter"
          isLoggedIn={!!userId}
        />
      ) : (
        <>
          <div className={styles.header}>
            <h1 className={styles.title}>
              {chapterNumber}-р бүлэг: {chapter.title}
            </h1>
          </div>
          <div className={styles.content} data-reader-content="true">
            {chapter.content.split(/\n\n+/).filter(p => p.trim()).map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        </>
      )}
      <div className={styles.navigation}>
        <div className={styles.navLeft}>
          {/* Хөндлөнгийн зай */}
        </div>
        <div className={styles.navCenter}>
          <ChapterNavLink
            target={prevChapter}
            novelSlug={slug}
            direction="prev"
            unlockedRegular={unlockedRegular}
            unlockedVolume={unlockedVolume}
            userId={userId}
            canManage={canManage}
          />
          <ChapterListModal
            chapters={novel.chapters}
            currentChapter={chapterNumber}
            novelSlug={novel.slug}
            unlockedRegular={unlockedRegular}
            unlockedVolume={unlockedVolume}
            userId={userId}
            canManage={canManage}
          />
          <ChapterNavLink
            target={nextChapter}
            novelSlug={slug}
            direction="next"
            unlockedRegular={unlockedRegular}
            unlockedVolume={unlockedVolume}
            userId={userId}
            canManage={canManage}
          />
        </div>
        <div className={styles.navRight}>
          {/* Хөндлөнгийн зай */}
        </div>
      </div>
      {!isLocked && (
        <>
          <ChapterReportButton chapterId={chapter.id} novelSlug={novel.slug} chapterNumber={chapterNumber} />
          <CommentSection novelId={novel.id} chapterId={chapter.id} />
        </>
      )}
    </div>
  );
}
