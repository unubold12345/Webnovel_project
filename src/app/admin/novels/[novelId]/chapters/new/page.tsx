import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import ChapterForm from "@/components/admin/ChapterForm";
import styles from "../page.module.css";

export const dynamic = "force-dynamic";

export default async function NewChapterPage({
  params,
}: {
  params: Promise<{ novelId: string }>;
}) {
  const { novelId } = await params;

  const novel = await db.webnovel.findUnique({
    where: { id: novelId },
    include: {
      chapters: {
        orderBy: { chapterNumber: "desc" },
        take: 1,
      },
    },
  });

  if (!novel) {
    notFound();
  }

  const lastChapter = novel.chapters[0];
  const nextChapterNumber = lastChapter ? lastChapter.chapterNumber + 1 : 0;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Add Chapter - {novel.title}</h1>
      </div>
      <ChapterForm novelId={novelId} nextChapterNumber={nextChapterNumber} />
    </div>
  );
}