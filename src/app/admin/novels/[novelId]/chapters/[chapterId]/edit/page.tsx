import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import ChapterForm from "@/components/admin/ChapterForm";
import styles from "../../page.module.css";

export const dynamic = "force-dynamic";

export default async function EditChapterPage({
  params,
}: {
  params: Promise<{ novelId: string; chapterId: string }>;
}) {
  const { novelId, chapterId } = await params;

  const chapter = await db.chapter.findUnique({
    where: { id: chapterId },
  });

  if (!chapter) {
    notFound();
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Edit Chapter {chapter.chapterNumber}</h1>
      </div>
      <ChapterForm novelId={novelId} initialData={chapter} />
    </div>
  );
}