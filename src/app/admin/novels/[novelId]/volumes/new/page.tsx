import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import VolumeForm from "@/components/admin/VolumeForm";
import styles from "../page.module.css";

export const dynamic = "force-dynamic";

export default async function NewVolumePage({
  params,
}: {
  params: Promise<{ novelId: string }>;
}) {
  const { novelId } = await params;

  const novel = await db.webnovel.findUnique({
    where: { id: novelId },
    include: {
      volumes: {
        orderBy: { volumeNumber: "desc" },
        take: 1,
      },
    },
  });

  if (!novel) {
    notFound();
  }

  const lastVolume = novel.volumes[0];
  const nextVolumeNumber = lastVolume ? lastVolume.volumeNumber + 1 : 1;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Add Volume - {novel.title}</h1>
      </div>
      <VolumeForm novelId={novelId} nextVolumeNumber={nextVolumeNumber} />
    </div>
  );
}