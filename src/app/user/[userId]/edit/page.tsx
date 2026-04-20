import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import ProfileForm from "../../../profile/edit/ProfileForm";
import styles from "../../../profile/edit/page.module.css";

export const dynamic = "force-dynamic";

export default async function EditProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const session = await auth();
  const { userId } = await params;

  if (!session?.user?.id || session.user.id !== userId) {
    redirect("/auth/login");
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      email: true,
      avatar: true,
      bio: true,
      password: true,
    },
  });

  if (!user) {
    redirect("/auth/login");
  }

  const needsPassword = !user.password || user.password.length === 0;

  return (
    <div className={styles.pageContainer}>
      <h1 className={styles.pageTitle}>Профайл засах</h1>
      <ProfileForm user={{ ...user, needsPassword }} />
    </div>
  );
}