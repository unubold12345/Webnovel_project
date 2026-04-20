import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import VolumeForm from "@/components/admin/VolumeForm";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

interface EditVolumePageProps {
  params: Promise<{ novelId: string; volumeId: string }>;
}

export default async function EditVolumePage({ params }: EditVolumePageProps) {
  const { novelId, volumeId } = await params;

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

  const initialData = {
    id: volume.id,
    volumeNumber: volume.volumeNumber,
    title: volume.title,
    thumbnail: volume.thumbnail,
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Боть засах - {volume.title}</h1>
      <VolumeForm
        novelId={novelId}
        basePath="/admin"
        initialData={initialData}
      />
    </div>
  );
}
