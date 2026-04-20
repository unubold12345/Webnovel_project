import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import WebnovelForm from "@/components/admin/WebnovelForm";

export const dynamic = "force-dynamic";

export default async function EditNovelPage({
  params,
}: {
  params: Promise<{ novelId: string }>;
}) {
  const { novelId } = await params;

  const novel = await db.webnovel.findUnique({
    where: { id: novelId },
  });

  if (!novel) {
    notFound();
  }

  return (
    <div>
      <h1>Edit Novel</h1>
      <WebnovelForm initialData={novel} />
    </div>
  );
}