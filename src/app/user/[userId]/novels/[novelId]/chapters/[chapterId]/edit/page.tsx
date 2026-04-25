import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import ChapterForm from "@/components/admin/ChapterForm";
import styles from "../../page.module.css";

export const dynamic = "force-dynamic";

export default async function EditChapterPage({
  params,
}: {
  params: Promise<{ userId: string; novelId: string; chapterId: string }>;
}) {
  const { userId, novelId, chapterId } = await params;

  const session = await auth();
  if (!session || session.user.id !== userId) {
    redirect("/");
  }

  const novel = await db.webnovel.findUnique({
    where: { id: novelId },
    select: { publisherId: true },
  });

  if (!novel || novel.publisherId !== session.user.id) {
    notFound();
  }

  const chapter = await db.chapter.findUnique({
    where: { id: chapterId },
  });

  if (!chapter) {
    notFound();
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Бүлэг засах #{chapter.chapterNumber}</h1>
      </div>
      <ChapterForm
        novelId={novelId}
        initialData={chapter}
        basePath={`/user/${userId}`}
        mode="user"
      />
    </div>
  );
}
