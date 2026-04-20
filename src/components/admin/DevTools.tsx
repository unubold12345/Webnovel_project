"use client";

import { useState } from "react";
import styles from "./DevTools.module.css";

export default function DevTools() {
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleDeleteAllComments = async () => {
    const confirmText = "'DELETE' ГЭЖ БИЧНЭ ҮҮ";
    const userInput = prompt(`⚠️ АНХААР: Энэ нь БҮХ сэтгэгдэл болон сэтгэгдлийн лайкуудыг устгах болно!\n\nЭнэ үйлдлийг буцааж болохгүй.\n\nБаталгаажуулахын тулд дараахыг бичнэ үү: ${confirmText}`);

    if (userInput !== "DELETE") {
      setMessage({ type: "error", text: "Устгах үйлдэл цуцлагдлаа. Баталгаажуулахын тулд 'DELETE' гэж бичнэ үү." });
      return;
    }

    setDeleting(true);
    setMessage(null);

    try {
      const res = await fetch("/api/dev/comments", {
        method: "DELETE",
      });

      if (res.ok) {
        const data = await res.json();
        setMessage({ type: "success", text: data.message });
      } else {
        const error = await res.json();
        setMessage({ type: "error", text: error.error || "Сэтгэгдлүүдийг устгаж чадсангүй" });
      }
    } catch {
      setMessage({ type: "error", text: "Сүлжээний алдаа. Дахин оролдоно уу." });
    }

    setDeleting(false);
  };

  return (
    <div className={styles.devTools}>
      <div className={styles.header}>
        <h2 className={styles.title}>Хөгжүүлэгчийн хэрэгсэл</h2>
        <span className={styles.badge}>Зөвхөн хөгжүүлэлтэд</span>
      </div>
      <div className={styles.content}>
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Сэтгэгдэл удирдах</h3>
          <p className={styles.description}>
            Бүх сэтгэгдэл болон сэтгэгдлийн лайкуудыг устгах. Вебньюэл, бүлэг болон хэрэглэгчийн бүртгэлд НӨЛӨӨЛӨХГҮЙ.
          </p>
          <button
            onClick={handleDeleteAllComments}
            disabled={deleting}
            className={styles.dangerButton}
          >
            {deleting ? "Устгаж байна..." : "Бүх сэтгэгдэл устгах"}
          </button>
          {message && (
            <p className={`${styles.message} ${styles[message.type]}`}>
              {message.text}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}