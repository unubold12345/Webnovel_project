import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import CommentSection from "@/components/ui/CommentSection";
import ChapterListModal from "@/components/ui/ChapterListModal";
import SaveProgress from "@/components/ui/SaveProgress";
import ChapterReportButton from "@/components/ui/ChapterReportButton";
import ReaderSettings from "@/components/ui/ReaderSettings";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string; chapterNumber: string }>;
}

export default async function ChapterPage({ params }: PageProps) {
  const { slug, chapterNumber: chapterNum } = await params;
  const chapterNumber = parseInt(chapterNum);

  const novel = await db.webnovel.findUnique({
    where: { slug },
    include: {
      chapters: {
        orderBy: { chapterNumber: "asc" },
        select: { id: true, chapterNumber: true, title: true },
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

  await db.chapter.update({
    where: { id: chapter.id },
    data: { viewCount: { increment: 1 } },
  });

  const prevChapter = novel.chapters.find(
    (c) => c.chapterNumber === chapterNumber - 1
  );
  const nextChapter = novel.chapters.find(
    (c) => c.chapterNumber === chapterNumber + 1
  );

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
          {prevChapter ? (
            <Link
              href={`/novels/${slug}/chapters/${prevChapter.chapterNumber}`}
              className={styles.navButton}
            >
              &lt;
            </Link>
          ) : (
            <span className={styles.navButtonDisabled}>&lt;</span>
          )}
          <ChapterListModal chapters={novel.chapters} currentChapter={chapterNumber} novelSlug={novel.slug} />
          {nextChapter ? (
            <Link
              href={`/novels/${slug}/chapters/${nextChapter.chapterNumber}`}
              className={styles.navButton}
            >
              &gt;
            </Link>
          ) : (
            <span className={styles.navButtonDisabled}>&gt;</span>
          )}
        </div>
        <div className={styles.navRight}>
          <ReaderSettings />
        </div>
      </div>
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
      <div className={styles.navigation}>
        <div className={styles.navLeft}>
          {/* Хөндлөнгийн зай */}
        </div>
        <div className={styles.navCenter}>
          {prevChapter ? (
            <Link
              href={`/novels/${slug}/chapters/${prevChapter.chapterNumber}`}
              className={styles.navButton}
            >
              &lt;
            </Link>
          ) : (
            <span className={styles.navButtonDisabled}>&lt;</span>
          )}
          <ChapterListModal chapters={novel.chapters} currentChapter={chapterNumber} novelSlug={novel.slug} />
          {nextChapter ? (
            <Link
              href={`/novels/${slug}/chapters/${nextChapter.chapterNumber}`}
              className={styles.navButton}
            >
              &gt;
            </Link>
          ) : (
            <span className={styles.navButtonDisabled}>&gt;</span>
          )}
        </div>
        <div className={styles.navRight}>
          {/* Хөндлөнгийн зай */}
        </div>
      </div>
      <ChapterReportButton chapterId={chapter.id} novelSlug={novel.slug} chapterNumber={chapterNumber} />
      <CommentSection novelId={novel.id} chapterId={chapter.id} />
    </div>
  );
}
