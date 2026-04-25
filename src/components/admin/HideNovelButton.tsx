"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useToast } from "@/components/ui/ToastContext";
import styles from "./HideNovelButton.module.css";

interface HideNovelButtonProps {
  novelId: string;
  novelTitle: string;
  hidden: boolean;
  hiddenReason?: string | null;
}

export default function HideNovelButton({ novelId, novelTitle, hidden, hiddenReason }: HideNovelButtonProps) {
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reason, setReason] = useState(hiddenReason || "");
  const [mounted, setMounted] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleToggle = async () => {
    if (!hidden && !reason.trim()) {
      addToast("Нуух шалтгаанаа бичнэ үү", "error");
      return;
    }

    setIsModalOpen(false);
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/novels/${novelId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hidden: !hidden, hiddenReason: reason.trim() || null }),
      });
      if (res.ok) {
        addToast(hidden ? "Зохиол нийтлэгдлээ" : "Зохиол нууцлагдлаа", "success");
        setTimeout(() => {
          window.location.reload();
        }, 1200);
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

  const modalContent = (
    <div className={styles.overlay} onClick={() => !loading && setIsModalOpen(false)}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>{hidden ? "Зохиол нийтлэх" : "Зохиол нуух"}</h3>
          <button className={styles.closeButton} onClick={() => setIsModalOpen(false)} disabled={loading}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div className={styles.body}>
          <p className={styles.message}>
            {hidden
              ? `"${novelTitle}" зохиолыг дахин нийтлэхдээ итгэлтэй байна уу?`
              : `"${novelTitle}" зохиолыг нууцлахдаа итгэлтэй байна уу? Хэрэглэгчид энэ зохиолыг харах боломжгүй болно.`}
          </p>
          {!hidden && (
            <div className={styles.field}>
              <label htmlFor={`hide-reason-${novelId}`} className={styles.label}>Нуух шалтгаан</label>
              <textarea
                id={`hide-reason-${novelId}`}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Жишээ: Дүрмийн зөрчил, хуулбарласан контент..."
                className={styles.textarea}
                rows={3}
                disabled={loading}
              />
            </div>
          )}
          {hidden && hiddenReason && (
            <div className={styles.reasonBox}>
              <span className={styles.reasonLabel}>Өмнөх шалтгаан:</span>
              <p className={styles.reasonText}>{hiddenReason}</p>
            </div>
          )}
        </div>
        <div className={styles.footer}>
          <button className={styles.cancelButton} onClick={() => setIsModalOpen(false)} disabled={loading}>
            Цуцлах
          </button>
          <button
            className={hidden ? styles.confirmUnhide : styles.confirmHide}
            onClick={handleToggle}
            disabled={loading}
          >
            {loading ? "Түр хүлээнэ үү..." : hidden ? "Нийтлэх" : "Нуух"}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setReason(hiddenReason || "");
          setIsModalOpen(true);
        }}
        disabled={loading}
        className={hidden ? styles.unhideButton : styles.hideButton}
      >
        {hidden ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
        )}
        {hidden ? "Нийтлэх" : "Нуух"}
      </button>

      {isModalOpen && mounted && createPortal(modalContent, document.body)}
    </>
  );
}
