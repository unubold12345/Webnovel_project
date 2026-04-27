"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useSession } from "next-auth/react";
import { dispatchCoinChange } from "@/lib/coinEvents";
import { lockScroll, unlockScroll } from "@/lib/scrollLock";
import styles from "./UnlockModal.module.css";

interface UnlockModalProps {
  title: string;
  coinCost: number;
  onUnlock: () => Promise<{ alreadyUnlocked?: boolean }>;
  onClose: () => void;
  redirectUrl?: string;
}

export default function UnlockModal({ title, coinCost, onUnlock, onClose, redirectUrl }: UnlockModalProps) {
  const { update } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [alreadyUnlocked, setAlreadyUnlocked] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    lockScroll();
    return () => {
      unlockScroll();
    };
  }, []);

  const handleUnlock = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await onUnlock();
      if (data.alreadyUnlocked) {
        setAlreadyUnlocked(true);
      } else {
        setSuccess(true);
        dispatchCoinChange(-coinCost);
        await update();
      }
    } catch (err: any) {
      setError(err.message || "Тайлахад алдаа гарлаа");
    } finally {
      setLoading(false);
    }
  };

  const handleRead = () => {
    if (redirectUrl) {
      window.location.href = redirectUrl;
    } else {
      window.location.reload();
    }
  };

  const isVolume = !redirectUrl;

  if (!mounted) return null;

  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>{isVolume ? "Түгжээлтэй боть" : "Түгжээлтэй бүлэг"}</h2>
          <button onClick={onClose} className={styles.closeButton}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className={styles.body}>
          {success ? (
            <div className={styles.success}>
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <p>{isVolume ? "Ботийг амжилттай тайллаа!" : "Бүлгийг амжилттай тайллаа!"}</p>
              <button onClick={handleRead} className={styles.unlockButton}>
                {isVolume ? "Үргэлжлүүлэх" : "Унших"}
              </button>
            </div>
          ) : alreadyUnlocked ? (
            <div className={styles.success}>
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <p>Та энийг аль хэдийн тайлсан байна.</p>
              <button onClick={handleRead} className={styles.unlockButton}>
                {isVolume ? "Үргэлжлүүлэх" : "Унших"}
              </button>
            </div>
          ) : (
            <>
              <div className={styles.lockIcon}>
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <p className={styles.chapterTitle}>{title}</p>
              <p className={styles.description}>
                {isVolume
                  ? "Энэ ботийг уншихын тулд та доорх зоосоор тайлах шаардлагатай."
                  : "Энэ бүлгийг уншихын тулд та доорх зоосоор тайлах шаардлагатай."}
              </p>
              <div className={styles.costBadge}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="8" r="7" />
                  <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
                </svg>
                <span>{coinCost.toLocaleString()} зоос</span>
              </div>
              {error && <p className={styles.error}>{error}</p>}
              <div className={styles.actions}>
                <button onClick={onClose} className={styles.cancelButton} disabled={loading}>
                  Болих
                </button>
                <button onClick={handleUnlock} className={styles.unlockButton} disabled={loading}>
                  {loading ? "Тайлаж байна..." : "Тайлах"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>, document.body
  );
}
