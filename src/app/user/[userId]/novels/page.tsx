"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Spinner from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/ToastContext";
import styles from "./page.module.css";

interface Novel {
  id: string;
  title: string;
  slug: string;
  author: string;
  novelType: string;
  status: string;
  hidden: boolean;
  hiddenReason: string | null;
  totalChapters: number;
  totalVolumes: number;
  _count: {
    chapters: number;
    volumes: number;
  };
}

function HideNovelButton({
  novelId,
  novelTitle,
  hidden,
  onToggled,
}: {
  novelId: string;
  novelTitle: string;
  hidden: boolean;
  onToggled: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  const handleToggle = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/user/novels/${novelId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hidden: !hidden }),
      });
      if (res.ok) {
        addToast(hidden ? "Зохиол нийтлэгдлээ" : "Зохиол нууцлагдлаа", "success");
        onToggled();
      } else {
        const error = await res.json();
        addToast(error.message || "Алдаа гарлаа", "error");
      }
    } catch {
      addToast("Алдаа гарлаа", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={loading}
      className={hidden ? styles.unhideButton : styles.hideButton}
      title={hidden ? "Нийтлэх" : "Нуух"}
    >
      {hidden ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
      )}
      {loading ? "Түр хүлээнэ үү..." : hidden ? "Нийтлэх" : "Нуух"}
    </button>
  );
}

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

export default function UserNovelsPage() {
  const params = useParams();
  const userId = params.userId as string;
  const { data: session } = useSession();
  const isOwner = session?.user?.id === userId;
  const [novels, setNovels] = useState<Novel[]>([]);
  const [loading, setLoading] = useState(true);
  const [acceptedTerms, setAcceptedTerms] = useState(!!session?.user?.acceptedTermsAt);

  const fetchNovels = async () => {
    setLoading(true);
    const res = await fetch("/api/user/novels");
    if (res.ok) {
      const data = await res.json();
      setNovels(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isOwner) {
      fetchNovels();
    } else {
      setLoading(false);
    }
  }, [isOwner]);

  if (!isOwner) {
    return (
      <div className={styles.container}>
        <p className={styles.empty}>Зөвхөн өөрийн зохиолуудыг харах боломжтой.</p>
      </div>
    );
  }

  if (loading) {
    return <Spinner />;
  }

  if (!acceptedTerms) {
    return (
      <div className={styles.container}>
        <div className={styles.termsRequired}>
          <h2>Нийтлэх эрх шаардлагатай</h2>
          <p>Өөрийн зохиол нийтлэхийн тулд эхлээд үйлчилгээний нөхцөлийг зөвшөөрнө үү.</p>
          <Link href={`/user/${userId}`} className={styles.termsButton}>
            Профайл руу очих
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Миний зохиолууд</h1>
          <p className={styles.subtitle}>Нийт {novels.length} зохиол бүртгэгдсэн</p>
        </div>
        <Link href={`/user/${userId}/novels/new`} className={styles.addButton}>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Шинэ зохиол нэмэх
        </Link>
      </div>

      {novels.length === 0 ? (
        <div className={styles.empty}>
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
          <p>Одоогоор зохиол байхгүй. Шинэ зохиол нэмээрэй!</p>
          <Link href={`/user/${userId}/novels/new`} className={styles.emptyCta}>Эхний зохиолоо нэмэх</Link>
        </div>
      ) : (
        <div className={styles.cardGrid}>
          {novels.map((novel) => (
            <div key={novel.id} className={`${styles.card} ${novel.hidden ? styles.cardHidden : ""}`}>
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
                {novel.hidden && novel.hiddenReason && (
                  <div className={styles.warningBanner}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    <div>
                      <span className={styles.warningTitle}>Админы анхааруулга</span>
                      <p className={styles.warningText}>{novel.hiddenReason}</p>
                    </div>
                  </div>
                )}
                <div className={styles.cardStats}>
                  <div className={styles.stat}>
                    <span className={styles.statValue}>
                      {novel.novelType === "light_novel" ? novel._count.volumes : novel._count.chapters}
                    </span>
                    <span className={styles.statLabel}>
                      {novel.novelType === "light_novel" ? "Боть" : "Бүлэг"}
                    </span>
                  </div>
                  <div className={styles.statDivider} />
                  <div className={styles.stat}>
                    <span className={styles.statValue}>
                      {novel.novelType === "light_novel" ? novel.totalVolumes : novel.totalChapters}
                    </span>
                    <span className={styles.statLabel}>Нийт</span>
                  </div>
                </div>
              </div>
              <div className={styles.cardActions}>
                {novel.novelType === "light_novel" ? (
                  <Link href={`/user/${userId}/novels/${novel.id}/chapters`} className={styles.cardActionBtn}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                    Боть
                  </Link>
                ) : (
                  <Link href={`/user/${userId}/novels/${novel.id}/chapters`} className={styles.cardActionBtn}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
                    Бүлэг
                  </Link>
                )}
                <Link href={`/novels/${novel.slug}`} className={styles.cardActionBtn} target="_blank">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  Харах
                </Link>
                <Link href={`/user/${userId}/novels/${novel.id}/edit`} className={styles.cardActionBtn}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  Засах
                </Link>
                <HideNovelButton
                  novelId={novel.id}
                  novelTitle={novel.title}
                  hidden={novel.hidden}
                  onToggled={fetchNovels}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
