"use client";

import { useState } from "react";
import styles from "./ScheduleChapterModal.module.css";

interface ScheduleChapterModalProps {
  novelId: string;
  existingChapterNumbers: number[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function ScheduleChapterModal({
  novelId,
  existingChapterNumbers,
  onClose,
  onSuccess,
}: ScheduleChapterModalProps) {
  const [chapterNumber, setChapterNumber] = useState("");
  const [title, setTitle] = useState("");
  const [scheduledFor, setScheduledFor] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const chapterNum = parseInt(chapterNumber);
    if (isNaN(chapterNum) || chapterNum <= 0) {
      setError("Зөв бүлгийн дугаар оруулна уу");
      return;
    }

    if (existingChapterNumbers.includes(chapterNum)) {
      setError("Энэ дугаартай бүлэг аль хэдийн байна");
      return;
    }

    if (!title.trim()) {
      setError("Гарчиг оруулна уу");
      return;
    }

    if (!scheduledFor) {
      setError("Огноо болон цаг сонгоно уу");
      return;
    }

    const scheduledDate = new Date(scheduledFor);
    if (scheduledDate <= new Date()) {
      setError("Товлосон цаг ирээдүйд байх ёстой");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch(`/api/admin/novels/${novelId}/scheduled-chapters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chapterNumber: chapterNum,
          title: title.trim(),
          scheduledFor: scheduledDate.toISOString(),
        }),
      });

      if (res.ok) {
        onSuccess();
        onClose();
      } else {
        const data = await res.json();
        setError(data.error || "Бүлэг товлож чадсангүй");
      }
    } catch {
      setError("Бүлэг товлож чадсангүй");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Бүлэг товлох</h2>
          <button onClick={onClose} className={styles.closeButton}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className={styles.body}>
            <div className={styles.field}>
              <label className={styles.label}>Бүлгийн дугаар</label>
              <input
                type="number"
                value={chapterNumber}
                onChange={(e) => setChapterNumber(e.target.value)}
                className={styles.input}
                min="1"
                placeholder="Бүлгийн дугаар оруулах"
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Гарчиг</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={styles.input}
                placeholder="Бүлгийн гарчиг оруулах"
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Товлох огноо</label>
              <input
                type="datetime-local"
                value={scheduledFor}
                onChange={(e) => setScheduledFor(e.target.value)}
                className={styles.input}
              />
            </div>
            {error && <p className={styles.error}>{error}</p>}
          </div>
          <div className={styles.footer}>
            <button type="button" onClick={onClose} className={styles.cancelButton}>
              Цуцлах
            </button>
            <button type="submit" disabled={submitting} className={styles.submitButton}>
              {submitting ? "Товлож байна..." : "Товлох"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}