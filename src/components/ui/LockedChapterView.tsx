"use client";

import { useState } from "react";
import UnlockModal from "./UnlockModal";
import styles from "./LockedChapterView.module.css";

interface LockedChapterViewProps {
  title: string;
  coinCost: number;
  id: string;
  type: "chapter" | "volumeChapter" | "volume";
  isLoggedIn: boolean;
}

export default function LockedChapterView({ title, coinCost, id, type, isLoggedIn }: LockedChapterViewProps) {
  const [unlockModalOpen, setUnlockModalOpen] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleUnlock = async () => {
    const res = await fetch("/api/chapters/unlock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, id }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Тайлахад алдаа гарлаа");
    }
    if (data.alreadyUnlocked) {
      return { alreadyUnlocked: true };
    }
    setSuccess(true);
    return { alreadyUnlocked: false };
  };

  return (
    <div className={styles.container}>
      {success ? (
        <div className={styles.success}>
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <h2>{type === "volume" ? "Ботийг амжилттай тайллаа!" : "Бүлгийг амжилттай тайллаа!"}</h2>
          <p>{type === "volume" ? "Та одоо энэ ботийн бүлгүүдийг унших боломжтой." : "Та одоо энэ бүлгийг унших боломжтой."}</p>
          <button onClick={() => window.location.reload()} className={styles.readButton}>
            {type === "volume" ? "Үргэлжлүүлэх" : "Унших"}
          </button>
        </div>
      ) : (
        <>
          <div className={styles.lockIcon}>
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h2 className={styles.title}>{title}</h2>
          <p className={styles.description}>
            {type === "volume"
              ? "Энэ боть түгжээлтэй байна. Уншихын тулд та доорх зоосоор тайлах шаардлагатай."
              : "Энэ бүлэг түгжээлтэй байна. Уншихын тулд та доорх зоосоор тайлах шаардлагатай."}
          </p>
          <div className={styles.costBadge}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="7" />
              <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
            </svg>
            <span>{coinCost.toLocaleString()} зоос</span>
          </div>
          {isLoggedIn ? (
            <button onClick={() => setUnlockModalOpen(true)} className={styles.unlockButton}>
              Тайлах
            </button>
          ) : (
            <a href="/auth/login" className={styles.unlockButton}>
              Нэвтэрч орох
            </a>
          )}
        </>
      )}

      {unlockModalOpen && (
        <UnlockModal
          title={title}
          coinCost={coinCost}
          onUnlock={handleUnlock}
          onClose={() => setUnlockModalOpen(false)}
        />
      )}
    </div>
  );
}
