import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import CommentSection from "@/components/ui/CommentSection";
import ChapterListModal from "@/components/ui/ChapterListModal";
import ReaderSettings from "@/components/ui/ReaderSettings";
import ViewCount from "@/components/ui/ViewCount";
import SaveProgress from "@/components/ui/SaveProgress";
import ChapterReportButton from "@/components/ui/ChapterReportButton";
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
  const chapNum = parseInt(chapterNumber);

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
          {prevChapter ? (
            <Link
              href={`/novels/${novel.slug}/volumes/${volume.volumeNumber}/chapters/${prevChapter.chapterNumber}`}
              className={styles.navButton}
            >
              {"<"}
            </Link>
          ) : (
            <span className={styles.navButtonDisabled}>{"<"}</span>
          )}
          <ChapterListModal chapters={volume.chapters} currentChapter={chapNum} novelSlug={novel.slug} volumeNumber={volume.volumeNumber} />
          {nextChapter ? (
            <Link
              href={`/novels/${novel.slug}/volumes/${volume.volumeNumber}/chapters/${nextChapter.chapterNumber}`}
              className={styles.navButton}
            >
              {">"}
            </Link>
          ) : (
            <span className={styles.navButtonDisabled}>{">"}</span>
          )}
        </div>
        <div className={styles.navRight}>
          <ReaderSettings />
        </div>
      </div>

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
                  <Image
                    src={part.image.url}
                    alt={`Illustration ${index + 1}`}
                    width={700}
                    height={1000}
                    style={{ width: "100%", height: "auto" }}
                    priority={index < 2}
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
                <Image
                  src={img}
                  alt={`Gallery image ${index + 1}`}
                  width={700}
                  height={1000}
                  style={{ width: "100%", height: "auto" }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={styles.navigation}>
        <div className={styles.navLeft}></div>
        <div className={styles.navCenter}>
          {prevChapter ? (
            <Link
              href={`/novels/${novel.slug}/volumes/${volume.volumeNumber}/chapters/${prevChapter.chapterNumber}`}
              className={styles.navButton}
            >
              {"<"}
            </Link>
          ) : (
            <span className={styles.navButtonDisabled}>{"<"}</span>
          )}
          <ChapterListModal chapters={volume.chapters} currentChapter={chapNum} novelSlug={novel.slug} volumeNumber={volume.volumeNumber} />
          {nextChapter ? (
            <Link
              href={`/novels/${novel.slug}/volumes/${volume.volumeNumber}/chapters/${nextChapter.chapterNumber}`}
              className={styles.navButton}
            >
              {">"}
            </Link>
          ) : (
            <span className={styles.navButtonDisabled}>{">"}</span>
          )}
        </div>
        <div className={styles.navRight}></div>
      </div>

      <ChapterReportButton chapterId={chapter.id} novelSlug={novel.slug} chapterNumber={chapNum} volumeNumber={volume.volumeNumber} />
      <CommentSection novelId={novel.id} volumeId={volume.id} />
    </div>
  );
}