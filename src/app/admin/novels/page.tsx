import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import Link from "next/link";
import DeleteNovelButton from "@/components/admin/DeleteNovelButton";
import HideNovelButton from "@/components/admin/HideNovelButton";
import { getNovelViewCounts } from "@/lib/views";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default async function AdminNovelsPage() {
  const session = await auth();
  const isAdmin = session?.user?.role === "admin";
  const isStaff = session?.user?.role === "admin" || session?.user?.role === "moderator";

  const [novels, viewCounts] = await Promise.all([
    db.webnovel.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        slug: true,
        author: true,
        translator: true,
        novelType: true,
        status: true,
        thumbnail: true,
        totalChapters: true,
        totalVolumes: true,
        hidden: true,
        hiddenReason: true,
        publisherId: true,
        publisher: {
          select: { username: true },
        },
        _count: {
          select: { chapters: true, volumes: true },
        },
      },
    }),
    getNovelViewCounts(),
  ]);

  const novelsWithViews = novels.map((novel) => ({
    ...novel,
    totalViews: viewCounts.get(novel.id) || 0,
  }));

  const adminNovels = novelsWithViews.filter((n) => !n.publisherId);
  const userNovels = novelsWithViews.filter((n) => n.publisherId);
  const totalViews = novelsWithViews.reduce((sum, n) => sum + n.totalViews, 0);

  const StatusBadge = ({ status }: { status: string }) => {
    const isCompleted = status === "completed";
    return (
      <span className={`${styles.statusBadge} ${isCompleted ? styles.statusCompleted : styles.statusOngoing}`}>
        {isCompleted ? "Дууссан" : "Үргэлжилж буй"}
      </span>
    );
  };

  const TypeBadge = ({ type }: { type: string }) => (
    <span className={`${styles.typeBadge} ${type === "light_novel" ? styles.typeLightNovel : styles.typeWebnovel}`}>
      {type === "light_novel" ? "Light Novel" : "Webnovel"}
    </span>
  );

  const NovelCard = ({ novel }: { novel: typeof novelsWithViews[0] }) => (
    <div className={`${styles.card} ${novel.hidden ? styles.cardHidden : ""}`}>
      <div className={`${styles.cardHeader} ${novel.novelType === "light_novel" ? styles.cardHeaderLN : styles.cardHeaderWN}`}>
        <div className={styles.cardHeaderBadges}>
          <TypeBadge type={novel.novelType} />
          <StatusBadge status={novel.status} />
          {novel.hidden && <span className={styles.hiddenBadge}>Нуусан</span>}
        </div>
      </div>
      <div className={styles.cardBody}>
        <h3 className={styles.cardTitle}>{novel.title}</h3>
        <p className={styles.cardAuthor}>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          {novel.author}
        </p>
        {novel.translator && (
          <p className={styles.cardTranslator}>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
            {novel.translator}
          </p>
        )}
        {novel.publisher?.username && (
          <p className={styles.cardPublisher}>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            {novel.publisher.username}
          </p>
        )}
        {novel.hidden && novel.hiddenReason && (
          <div className={styles.hiddenReasonBox}>
            <span className={styles.hiddenReasonLabel}>Шалтгаан:</span>
            <p className={styles.hiddenReasonText}>{novel.hiddenReason}</p>
          </div>
        )}
        <div className={styles.cardStats}>
          <div className={styles.stat}>
            <span className={styles.statValue}>
              {novel.novelType === "light_novel"
                ? novel._count.volumes
                : novel._count.chapters}
            </span>
            <span className={styles.statLabel}>
              {novel.novelType === "light_novel" ? "Боть" : "Бүлэг"}
            </span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.stat}>
            <span className={styles.statValue}>{novel.totalViews.toLocaleString()}</span>
            <span className={styles.statLabel}>Үзэлт</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.stat}>
            <span className={styles.statValue}>
              {novel.novelType === "light_novel"
                ? novel.totalVolumes
                : novel.totalChapters}
            </span>
            <span className={styles.statLabel}>Нийт</span>
          </div>
        </div>
      </div>
      <div className={styles.cardActions}>
        {novel.novelType === "light_novel" ? (
          <Link href={`/admin/novels/${novel.id}/volumes`} className={styles.cardActionBtn}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
            Боть
          </Link>
        ) : (
          <Link href={`/admin/novels/${novel.id}/chapters`} className={styles.cardActionBtn}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
            Бүлэг
          </Link>
        )}
        <Link href={`/novels/${novel.slug}`} className={styles.cardActionBtn}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          Харах
        </Link>
        <Link href={`/admin/novels/${novel.id}/info`} className={styles.cardActionBtn}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
          Мэдээлэл
        </Link>
        <Link href={`/admin/novels/${novel.id}/edit`} className={styles.cardActionBtn}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          Засах
        </Link>
        {isStaff && (
          <HideNovelButton
            novelId={novel.id}
            novelTitle={novel.title}
            hidden={novel.hidden}
            hiddenReason={novel.hiddenReason}
          />
        )}
        {isAdmin && (
          <DeleteNovelButton novelId={novel.id} novelTitle={novel.title} />
        )}
      </div>
    </div>
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Зохиолууд</h1>
          <p className={styles.subtitle}>Нийт {novels.length} зохиол бүртгэгдсэн</p>
        </div>
        <Link href="/admin/novels/new" className={styles.addButton}>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Шинэ зохиол
        </Link>
      </div>

      {/* Stats */}
      {novels.length > 0 && (
        <div className={styles.statsBar}>
          <div className={styles.statCard}>
            <span className={styles.statCardValue}>{novels.length}</span>
            <span className={styles.statCardLabel}>Нийт зохиол</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statCardValue}>{adminNovels.length}</span>
            <span className={styles.statCardLabel}>Админы</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statCardValue}>{userNovels.length}</span>
            <span className={styles.statCardLabel}>Хэрэглэгчийн</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statCardValue}>{totalViews.toLocaleString()}</span>
            <span className={styles.statCardLabel}>Нийт үзэлт</span>
          </div>
        </div>
      )}

      <div className={styles.list}>
        {novels.length === 0 ? (
          <div className={styles.empty}>
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
            <p>Одоогоор зохиол байхгүй.</p>
            <Link href="/admin/novels/new" className={styles.emptyCta}>Эхний зохиолоо нэмэх</Link>
          </div>
        ) : (
          <>
            {adminNovels.length > 0 && (
              <div className={styles.section}>
                <h2 className={styles.sectionTitle}>
                  <span className={styles.sectionDot} />
                  Админы зохиол
                  <span className={styles.sectionCount}>{adminNovels.length}</span>
                </h2>
                <div className={styles.cardGrid}>
                  {adminNovels.map((novel) => (
                    <NovelCard key={novel.id} novel={novel} />
                  ))}
                </div>
              </div>
            )}
            {userNovels.length > 0 && (
              <div className={styles.section}>
                <h2 className={styles.sectionTitle}>
                  <span className={`${styles.sectionDot} ${styles.sectionDotUser}`} />
                  Хэрэглэгчийн зохиол
                  <span className={styles.sectionCount}>{userNovels.length}</span>
                </h2>
                <div className={styles.cardGrid}>
                  {userNovels.map((novel) => (
                    <NovelCard key={novel.id} novel={novel} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
