import WebnovelForm from "@/components/admin/WebnovelForm";

export default async function NewNovelPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;

  return (
    <div>
      <h1>Шинэ зохиол нэмэх</h1>
      <WebnovelForm basePath={`/user/${userId}`} mode="user" />
    </div>
  );
}
