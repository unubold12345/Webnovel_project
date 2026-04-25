import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import CommentSection from "@/components/ui/CommentSection";
import ChapterListModal from "@/components/ui/ChapterListModal";
import ReaderSettings from "@/components/ui/ReaderSettings";
import ViewCount from "@/components/ui/ViewCount";
import SaveProgress from "@/components/ui/SaveProgress";
import ChapterReportButton from "@/components/ui/ChapterReportButton";
import LockedChapterView from "@/components/ui/LockedChapterView";
import ChapterNavLink from "@/components/ui/ChapterNavLink";
import { getVolumeRemainingCost } from "@/lib/volume-remaining-cost";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string; volumeNumber: string; chapterNumber: string }>;
}

interface ContentImage {
  id: string;
  url: string;
  position: number;
}

function parseContent(content: string, contentImages: ContentImage[]) {
  const imageMap = new Map<string, ContentImage>();
  contentImages.forEach((img) => {
    imageMap.set(`[IMAGE:${img.id}]`, img);
  });

  const parts: Array<{ type: "text"; content: string } | { type: "image"; image: ContentImage }> = [];
  let remainingContent = content;
  const placeholderRegex = /\[IMAGE:img_\d+_\d+\]/g;
  let lastIndex = 0;
  let match;

  while ((match = placeholderRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      const textContent = remainingContent.slice(lastIndex, match.index).trim();
      if (textContent) {
        parts.push({ type: "text", content: textContent });
      }
    }
    const placeholder = match[0];
    const image = imageMap.get(placeholder);
    if (image) {
      parts.push({ type: "image", image });
    }
    lastIndex = match.index + placeholder.length;
  }

  if (lastIndex < content.length) {
    const textContent = remainingContent.slice(lastIndex).trim();
    if (textContent) {
      parts.push({ type: "text", content: textContent });
    }
  }

  return parts;
}

export default async function VolumeChapterReadPage({ params }: PageProps) {
  const { slug, volumeNumber, chapterNumber } = await params;
  const volNum = parseInt(volumeNumber);
  const chapNum = parseFloat(chapterNumber);
  const session = await auth();

  const novel = await db.webnovel.findUnique({
    where: { slug },
    select: { id: true, title: true, slug: true },
  });

  if (!novel) {
    notFound();
  }

  const volume = await db.volume.findUnique({
    where: { novelId_volumeNumber: { novelId: novel.id, volumeNumber: volNum } },
    include: {
      chapters: {
        orderBy: { chapterNumber: "asc" },
        select: {
          id: true,
          chapterNumber: true,
          title: true,
          content: true,
          contentImages: true,
          images: true,
          viewCount: true,
          isPaid: true,
          coinCost: true,
        },
      },
    },
  });

  if (!volume) {
    notFound();
  }

  const chapter = volume.chapters.find((c) => c.chapterNumber === chapNum);

  if (!chapter) {
    notFound();
  }

  const canManage = session?.user?.role === "admin" || session?.user?.role === "moderator";

  // Calculate remaining cost for volume unlock
  const volumeRemainingCost = session?.user?.id
    ? await getVolumeRemainingCost(session.user.id, volume.id, volume.coinCost)
    : volume.coinCost;

  // Check if chapter is locked (admins and moderators can bypass)
  let isLocked = false;
  let lockType: "volume" | "chapter" = "chapter";
  let lockCoinCost = 0;
  if (!canManage) {
    if (!session?.user?.id) {
      // Not logged in: locked if volume is paid (unless chapter is free) or chapter is paid
      if (volume.isPaid && !chapter.isPaid) {
        isLocked = false;
      } else if (volume.isPaid) {
        isLocked = true;
        lockType = "volume";
        lockCoinCost = volume.coinCost;
      } else if (chapter.isPaid) {
        isLocked = true;
        lockType = "chapter";
        lockCoinCost = chapter.coinCost;
      }
    } else {
      // 1. If user previously unlocked the whole volume, always grant access
      const volumeUnlocked = await db.unlockedVolume.findUnique({
        where: { userId_volumeId: { userId: session.user.id, volumeId: volume.id } },
      });
      if (volumeUnlocked) {
        isLocked = false;
      } else if (volume.isPaid) {
        // Chapter marked as free inside paid volume
        if (!chapter.isPaid) {
          isLocked = false;
        } else if (volumeRemainingCost === 0) {
          // If remaining cost is 0 (already paid enough via individual chapters), treat as unlocked
          isLocked = false;
        } else {
          // Honor previously unlocked individual chapters even after volume becomes paid
          const chapterUnlocked = await db.unlockedChapter.findUnique({
            where: { userId_volumeChapterId: { userId: session.user.id, volumeChapterId: chapter.id } },
          });
          if (chapterUnlocked) {
            isLocked = false;
          } else {
            isLocked = true;
            lockType = "volume";
            lockCoinCost = volumeRemainingCost;
          }
        }
      } else if (chapter.isPaid) {
        const chapterUnlocked = await db.unlockedChapter.findUnique({
          where: { userId_volumeChapterId: { userId: session.user.id, volumeChapterId: chapter.id } },
        });
        isLocked = !chapterUnlocked;
        lockType = "chapter";
        lockCoinCost = chapter.coinCost;
      }
    }
  }

  if (!isLocked) {
    await db.volumeChapter.update({
      where: { id: chapter.id },
      data: { viewCount: { increment: 1 } },
    });
  }

  const currentIndex = volume.chapters.findIndex((c) => c.chapterNumber === chapNum);
  const prevChapter = currentIndex > 0 ? volume.chapters[currentIndex - 1] : null;
  const nextChapter = currentIndex < volume.chapters.length - 1 ? volume.chapters[currentIndex + 1] : null;

  let contentImages: ContentImage[] = [];
  let galleryImages: string[] = [];

  try {
    contentImages = JSON.parse(chapter.contentImages) as ContentImage[];
  } catch {
    contentImages = [];
  }

  try {
    galleryImages = JSON.parse(chapter.images) as string[];
  } catch {
    galleryImages = [];
  }

  const contentParts = parseContent(chapter.content, contentImages);

  const userId = session?.user?.id ?? null;
  const unlockedChapterIds = userId
    ? await db.unlockedChapter.findMany({
        where: { userId },
        select: { chapterId: true, volumeChapterId: true },
      })
    : [];
  const unlockedRegular = new Set(unlockedChapterIds.map((u) => u.chapterId).filter((id): id is string => !!id));
  const unlockedVolume = new Set(unlockedChapterIds.map((u) => u.volumeChapterId).filter((id): id is string => !!id));

  const volumeUnlocked = userId
    ? !!(await db.unlockedVolume.findUnique({
        where: { userId_volumeId: { userId, volumeId: volume.id } },
      }))
    : false;

  return (
    <div className={styles.container} data-reader-container="true">
      <ViewCount
        novelId={novel.id}
        volumeNumber={volume.volumeNumber}
        chapterNumber={chapter.chapterNumber}
      />

      <SaveProgress
        novelId={novel.id}
        chapterNumber={chapter.chapterNumber}
        volumeChapterId={chapter.id}
        volumeId={volume.id}
        isVolumeChapter={true}
      />

      <nav className={styles.breadcrumb}>
        <Link href="/" className={styles.breadcrumbLink}>{"Нүүр"}</Link>
        <span className={styles.breadcrumbSeparator}>/</span>
        <Link href={`/novels/${novel.slug}`} className={styles.breadcrumbLink}>{novel.title}</Link>
        <span className={styles.breadcrumbSeparator}>/</span>
        <span className={styles.breadcrumbCurrent}>{volume.title}</span>
        <span className={styles.breadcrumbSeparator}>/</span>
        <span className={styles.breadcrumbCurrent}>{chapter.title}</span>
      </nav>

      <div className={styles.navigation}>
        <div className={styles.navLeft}></div>
        <div className={styles.navCenter}>
          <ChapterNavLink
            target={prevChapter}
            novelSlug={novel.slug}
            direction="prev"
            unlockedRegular={unlockedRegular}
            unlockedVolume={unlockedVolume}
            userId={userId}
            volumeNumber={volume.volumeNumber}
            canManage={canManage}
            volumeUnlocked={volumeUnlocked}
          />
          <ChapterListModal
            chapters={volume.chapters}
            currentChapter={chapNum}
            novelSlug={novel.slug}
            volumeNumber={volume.volumeNumber}
            unlockedRegular={unlockedRegular}
            unlockedVolume={unlockedVolume}
            userId={userId}
            canManage={canManage}
            volumeUnlocked={volumeUnlocked}
          />
          <ChapterNavLink
            target={nextChapter}
            novelSlug={novel.slug}
            direction="next"
            unlockedRegular={unlockedRegular}
            unlockedVolume={unlockedVolume}
            userId={userId}
            volumeNumber={volume.volumeNumber}
            canManage={canManage}
            volumeUnlocked={volumeUnlocked}
          />
        </div>
        <div className={styles.navRight}>
          <ReaderSettings />
        </div>
      </div>

      {isLocked ? (
        <LockedChapterView
          title={lockType === "volume" ? volume.title : `${volume.title} - ${chapter.title}`}
          coinCost={lockCoinCost}
          id={lockType === "volume" ? volume.id : chapter.id}
          type={lockType === "volume" ? "volume" : "volumeChapter"}
          isLoggedIn={!!userId}
        />
      ) : (
        <>
          <div className={styles.header}>
            <span className={styles.volumeTitle}>{volume.title}</span>
            <h1 className={styles.title}>{chapter.title}</h1>
          </div>

          <div className={styles.content} data-reader-content="true">
            {contentParts.length > 0 ? (
              contentParts.map((part, index) => {
                if (part.type === "image") {
                  return (
                    <div key={`img-${index}`} className={styles.inlineImageWrapper}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={part.image.url}
                        alt={`Illustration ${index + 1}`}
                        style={{ width: "100%", height: "auto", maxWidth: "100%" }}
                      />
                    </div>
                  );
                } else {
                  const paragraphs = part.content.split(/\n\n+/).filter((p) => p.trim());
                  return paragraphs.map((paragraph, pIndex) => (
                    <p key={`text-${index}-${pIndex}`}>{paragraph}</p>
                  ));
                }
              })
            ) : (
              chapter.content.split(/\n\n+/).filter((p) => p.trim()).map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))
            )}
          </div>

          {galleryImages.length > 0 && (
            <div className={styles.gallerySection}>
              <h2 className={styles.galleryTitle}>{"Нэмэлт зургууд"}</h2>
              <div className={styles.gallery}>
                {galleryImages.map((img, index) => (
                  <div key={index} className={styles.galleryImageWrapper}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img}
                      alt={`Gallery image ${index + 1}`}
                      style={{ width: "100%", height: "auto", maxWidth: "100%" }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <div className={styles.navigation}>
        <div className={styles.navLeft}></div>
        <div className={styles.navCenter}>
          <ChapterNavLink
            target={prevChapter}
            novelSlug={novel.slug}
            direction="prev"
            unlockedRegular={unlockedRegular}
            unlockedVolume={unlockedVolume}
            userId={userId}
            volumeNumber={volume.volumeNumber}
            canManage={canManage}
            volumeUnlocked={volumeUnlocked}
          />
          <ChapterListModal
            chapters={volume.chapters}
            currentChapter={chapNum}
            novelSlug={novel.slug}
            volumeNumber={volume.volumeNumber}
            unlockedRegular={unlockedRegular}
            unlockedVolume={unlockedVolume}
            userId={userId}
            canManage={canManage}
            volumeUnlocked={volumeUnlocked}
          />
          <ChapterNavLink
            target={nextChapter}
            novelSlug={novel.slug}
            direction="next"
            unlockedRegular={unlockedRegular}
            unlockedVolume={unlockedVolume}
            userId={userId}
            volumeNumber={volume.volumeNumber}
            canManage={canManage}
            volumeUnlocked={volumeUnlocked}
          />
        </div>
        <div className={styles.navRight}></div>
      </div>

      {!isLocked && (
        <>
          <ChapterReportButton chapterId={chapter.id} novelSlug={novel.slug} chapterNumber={chapNum} volumeNumber={volume.volumeNumber} />
          <CommentSection novelId={novel.id} volumeId={volume.id} />
        </>
      )}
    </div>
  );
}
