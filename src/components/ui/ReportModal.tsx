"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useSession } from "next-auth/react";
import { lockScroll, unlockScroll } from "@/lib/scrollLock";
import styles from "./ReportModal.module.css";

interface ReportModalProps {
  chapterId: string;
  novelSlug: string;
  chapterNumber: number;
  volumeNumber?: number;
  onClose: () => void;
}

export default function ReportModal({ chapterId, novelSlug, chapterNumber, volumeNumber, onClose }: ReportModalProps) {
  const { data: session } = useSession();
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user?.id) return;

    if (!reason.trim()) {
      setError("Мэдээллийн шалтгаанаа оруулна уу.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chapterId,
          reason: reason.trim(),
        }),
      });

      if (res.ok) {
        setSubmitted(true);
      } else {
        const data = await res.json();
        setError(data.error || "Мэдээлэл илгээж чадсангүй");
      }
    } catch {
      setError("Мэдээлэл илгээж чадсангүй");
    } finally {
      setSubmitting(false);
    }
  };

  if (!mounted) return null;

  if (submitted) {
    return createPortal(
      <div className={styles.modalOverlay} onClick={onClose}>
        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
          <div className={styles.successContent}>
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.successIcon}>
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <h3>Мэдээлэл илгээгдлээ</h3>
            <p>Мэдээллийг илгээсэнд баярлалаа. Бид удахгүй үүнийг хянан шийдвэрлэнэ.</p>
            <button onClick={onClose} className={styles.closeButton}>Хаах</button>
          </div>
          </div>
        </div>, document.body
    );
  }

  const modalTitle = volumeNumber 
    ? `${volumeNumber}-р боть ${chapterNumber}-р бүлэг мэдээлэх`
    : `${chapterNumber}-р бүлэг мэдээлэх`;

  return createPortal(
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>{modalTitle}</h3>
          <button onClick={onClose} className={styles.modalClose}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            <p className={styles.modalDescription}>
              Энэ бүлэгтэй холбоотой асуудлыг мэдээлж, унших туршлагыг сайжруулахад тусална уу.
            </p>
            <label className={styles.modalLabel}>Мэдээллийн шалтгаан</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Асуудлыг тайлбарлана уу..."
              className={styles.modalTextarea}
              autoFocus
              rows={4}
            />
            {error && <p className={styles.errorText}>{error}</p>}
          </div>
          <div className={styles.modalFooter}>
            <button type="button" onClick={onClose} className={styles.cancelButton}>
              Цуцлах
            </button>
            <button type="submit" disabled={submitting} className={styles.submitButton}>
              {submitting ? "Илгээж байна..." : "Мэдээлэл илгээх"}
            </button>
          </div>
      </form>
      </div>
    </div>, document.body
  );
}