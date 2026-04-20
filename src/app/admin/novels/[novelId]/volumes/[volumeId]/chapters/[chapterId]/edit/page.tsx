import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import VolumeChapterForm from "@/components/admin/VolumeChapterForm";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

interface EditVolumeChapterPageProps {
  params: Promise<{ novelId: string; volumeId: string; chapterId: string }>;
}

interface ContentImage {
  id: string;
  url: string;
  position: number;
}

export default async function EditVolumeChapterPage({ params }: EditVolumeChapterPageProps) {
  const { novelId, volumeId, chapterId } = await params;

  const novel = await db.webnovel.findUnique({
    where: { id: novelId },
  });

  if (!novel) {
    notFound();
  }

  const volume = await db.volume.findUnique({
    where: { id: volumeId },
  });

  if (!volume) {
    notFound();
  }

  const chapter = await db.volumeChapter.findUnique({
    where: { id: chapterId },
  });

  if (!chapter) {
    notFound();
  }

  // Parse images
  let contentImages: ContentImage[] = [];
  let images: string[] = [];

  try {
    contentImages = JSON.parse(chapter.contentImages) as ContentImage[];
  } catch {
    contentImages = [];
  }

  try {
    images = JSON.parse(chapter.images) as string[];
  } catch {
    images = [];
  }

  const initialData = {
    id: chapter.id,
    chapterNumber: chapter.chapterNumber,
    title: chapter.title,
    content: chapter.content,
    contentImages,
    images,
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Бүлэг засах - {chapter.title}</h1>
      <VolumeChapterForm
        novelId={novelId}
        volumeId={volumeId}
        basePath="/admin"
        initialData={initialData}
      />
    </div>
  );
}
