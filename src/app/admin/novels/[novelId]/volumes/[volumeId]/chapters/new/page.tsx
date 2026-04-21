import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import VolumeChapterForm from "@/components/admin/VolumeChapterForm";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

interface NewVolumeChapterPageProps {
  params: Promise<{ novelId: string; volumeId: string }>;
}

export default async function NewVolumeChapterPage({ params }: NewVolumeChapterPageProps) {
  const { novelId, volumeId } = await params;

  const novel = await db.webnovel.findUnique({
    where: { id: novelId },
  });

  if (!novel) {
    notFound();
  }

  const volume = await db.volume.findUnique({
    where: { id: volumeId },
    include: {
      chapters: {
        orderBy: { chapterNumber: "desc" },
        take: 1,
      },
    },
  });

  if (!volume) {
    notFound();
  }

  const lastChapter = volume.chapters[0];
  const nextChapterNumber = lastChapter ? lastChapter.chapterNumber + 1 : 0;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>
          Бүлэг нэмэх - {volume.title}
        </h1>
      </div>
      <VolumeChapterForm
        novelId={novelId}
        volumeId={volumeId}
        nextChapterNumber={nextChapterNumber}
      />
    </div>
  );
}