import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import ReviewsPageClient from "./ReviewsPageClient";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function ReviewsPage({ params }: PageProps) {
  const { slug } = await params;
  const session = await auth();

  const novel = await db.webnovel.findUnique({
    where: { slug },
    select: {
      id: true,
      title: true,
      slug: true,
      thumbnail: true,
    },
  });

  if (!novel) {
    redirect("/");
  }

  // Fetch reviews with user info
  const reviews = await db.review.findMany({
    where: { novelId: novel.id },
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          avatar: true,
          role: true,
        },
      },
      likes: session?.user?.id
        ? {
            where: { userId: session.user.id },
            select: { type: true },
          }
        : false,
    },
  });

  // Format reviews for the client component
  const formattedReviews = reviews.map((review) => ({
    ...review,
    userLike: review.likes?.[0] || null,
  }));

  // Calculate statistics
  const totalReviews = reviews.length;
  const averageRating =
    totalReviews > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
      : 0;

  // Check if current user has already reviewed
  const currentUserHasReviewed = session?.user?.id
    ? reviews.some((r) => r.userId === session.user.id)
    : false;

  return (
    <div className={styles.container}>
      {/* Breadcrumb */}
      <nav className={styles.breadcrumb}>
        <Link href="/" className={styles.breadcrumbLink}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          Нүүр
        </Link>
        <span className={styles.breadcrumbSeparator}>&gt;</span>
        <Link href={`/novels/${novel.slug}`} className={styles.breadcrumbLink}>
          {novel.title}
        </Link>
        <span className={styles.breadcrumbSeparator}>&gt;</span>
        <span className={styles.breadcrumbCurrent}>Шүүмжлэл</span>
      </nav>

      {/* Novel Header Card */}
      <div className={styles.novelCard}>
        <div className={styles.novelInfo}>
          <div className={styles.thumbnailWrapper}>
            {novel.thumbnail ? (
              <Image
                src={novel.thumbnail}
                alt={novel.title}
                fill
                className={styles.thumbnail}
              />
            ) : (
              <div className={styles.placeholder}>
                {novel.title.charAt(0)}
              </div>
            )}
          </div>
            <div className={styles.novelDetails}>
            <h1 className={styles.novelTitle}>{novel.title}</h1>
            <div className={styles.novelMeta}>
              <span className={styles.updateInfo}>1 хоногийн өмнө шинэчлэгдсэн</span>
            </div>
          </div>
        </div>
      </div>

      {/* Client Component */}
      <ReviewsPageClient
        novelId={novel.id}
        novelSlug={novel.slug}
        novelTitle={novel.title}
        initialReviews={formattedReviews}
        totalReviews={totalReviews}
        averageRating={averageRating}
        currentUserId={session?.user?.id}
        currentUserRole={session?.user?.role}
        currentUserHasReviewed={currentUserHasReviewed}
      />
    </div>
  );
}
