"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/ui/ToastContext";
import styles from "./ChapterForm.module.css";

interface ChapterFormProps {
  novelId: string;
  nextChapterNumber?: number;
  initialData?: {
    id: string;
    chapterNumber: number;
    title: string;
    content: string;
    originalContent?: string | null;
  };
  basePath?: string;
}

export default function ChapterForm({ novelId, nextChapterNumber = 1, initialData, basePath = "/admin" }: ChapterFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();
  const [formData, setFormData] = useState({
    chapterNumber: initialData?.chapterNumber || nextChapterNumber,
    title: initialData?.title || "",
    content: initialData?.content || "",
    originalContent: initialData?.originalContent || "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const method = initialData ? "PUT" : "POST";
    const url = initialData
      ? `/api/admin/novels/${novelId}/chapters/${initialData.id}`
      : `/api/admin/novels/${novelId}/chapters`;

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        if (initialData) {
          addToast("Бүлэг амжилттай шинэчлэгдлээ", "success");
        } else {
          addToast("Бүлэг амжилттай нэмэгдлээ", "success");
        }
        setTimeout(() => {
          router.push(`${basePath}/novels/${novelId}/chapters`);
        }, 1500);
      } else {
        const error = await res.json();
        addToast(error.message || "Хадгалахад алдаа гарлаа", "error");
      }
    } catch {
      addToast("Хадгалахад алдаа гарлаа", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.field}>
          <label className={styles.label}>Бүлгийн дугаар</label>
          <input
            type="number"
            name="chapterNumber"
            value={formData.chapterNumber}
            onChange={handleChange}
            className={styles.input}
            required
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Гарчиг (заавал биш)</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            className={styles.input}
            placeholder="Бүлгийн гарчиг (хоосон бол дугаар ашиглана)"
          />
        </div>
        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label}>Орчуулга</label>
            <textarea
              name="content"
              value={formData.content}
              onChange={handleChange}
              className={styles.textarea}
              required
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Эх хувилбар</label>
            <textarea
              name="originalContent"
              value={formData.originalContent}
              onChange={handleChange}
              className={styles.textarea}
              placeholder="Оригиналь агуулга (заавал биш)"
            />
          </div>
        </div>
        <div className={styles.actions}>
          <button type="submit" className={styles.button} disabled={loading}>
            {loading ? "Хадгалж байна..." : "Хадгалах"}
          </button>
          <Link
            href={`${basePath}/novels/${novelId}/chapters`}
            className={styles.secondaryButton}
          >
            Цуцлах
          </Link>
        </div>
      </form>
    </>
  );
}
