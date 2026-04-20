import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string; volumeNumber: string }>;
}

export default async function VolumePage({ params }: PageProps) {
  const { slug, volumeNumber } = await params;
  const volNum = parseInt(volumeNumber);

  const novel = await db.webnovel.findUnique({
    where: { slug },
    include: {
      volumes: {
        where: { volumeNumber: volNum },
        include: {
          chapters: {
            orderBy: { chapterNumber: "asc" },
            take: 1,
          },
        },
      },
    },
  });

  if (!novel) {
    notFound();
  }

  const volume = novel.volumes[0];

  if (!volume) {
    notFound();
  }

  // If volume has chapters, redirect to the first chapter
  if (volume.chapters.length > 0) {
    const firstChapter = volume.chapters[0];
    redirect(`/novels/${slug}/volumes/${volumeNumber}/chapters/${firstChapter.chapterNumber}`);
  }

  // If no chapters, show a message (or redirect to novel page)
  redirect(`/novels/${slug}`);
}
