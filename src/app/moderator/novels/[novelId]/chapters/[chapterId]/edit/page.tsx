import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import ChapterForm from "@/components/admin/ChapterForm";

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
    <div>
      <h1>Edit Chapter</h1>
      <ChapterForm novelId={novelId} initialData={chapter} basePath="/moderator" />
    </div>
  );
}