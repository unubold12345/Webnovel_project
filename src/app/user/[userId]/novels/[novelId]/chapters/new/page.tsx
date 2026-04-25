import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import ChapterForm from "@/components/admin/ChapterForm";
import styles from "../page.module.css";

export const dynamic = "force-dynamic";

export default async function NewChapterPage({
  params,
}: {
  params: Promise<{ userId: string; novelId: string }>;
}) {
  const { userId, novelId } = await params;

  const session = await auth();
  if (!session || session.user.id !== userId) {
    redirect("/");
  }

  const novel = await db.webnovel.findUnique({
    where: { id: novelId },
    include: {
      chapters: {
        orderBy: { chapterNumber: "desc" },
        take: 1,
      },
    },
  });

  if (!novel || novel.publisherId !== session.user.id) {
    notFound();
  }

  const lastChapter = novel.chapters[0];
  const nextChapterNumber = lastChapter ? lastChapter.chapterNumber + 1 : 0;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Шинэ бүлэг нэмэх - {novel.title}</h1>
      </div>
      <ChapterForm
        novelId={novelId}
        nextChapterNumber={nextChapterNumber}
        basePath={`/user/${userId}`}
        mode="user"
      />
    </div>
  );
}
