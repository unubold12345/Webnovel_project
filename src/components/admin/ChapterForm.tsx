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
  mode?: "admin" | "user";
}

export default function ChapterForm({ novelId, nextChapterNumber = 1, initialData, basePath = "/admin", mode = "admin" }: ChapterFormProps) {
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
    const apiPrefix = mode === "user" ? "/api/user" : "/api/admin";
    const url = initialData
      ? `${apiPrefix}/novels/${novelId}/chapters/${initialData.id}`
      : `${apiPrefix}/novels/${novelId}/chapters`;

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
        {/* Basic Info */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionNumber}>1</span>
            <h3 className={styles.sectionTitle}>Ерөнхий мэдээлэл</h3>
          </div>
          <div className={styles.grid2}>
            <div className={styles.field}>
              <label className={styles.label}>Бүлгийн дугаар</label>
              <input
                type="number"
                name="chapterNumber"
                value={formData.chapterNumber}
                onChange={handleChange}
                className={styles.input}
                required
                min={1}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Гарчиг <span className={styles.optional}>(заавал биш)</span></label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className={styles.input}
                placeholder="Бүлгийн гарчиг"
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionNumber}>2</span>
            <h3 className={styles.sectionTitle}>Агуулга</h3>
          </div>
          {mode === "user" ? (
            <div className={styles.field}>
              <textarea
                name="content"
                value={formData.content}
                onChange={handleChange}
                className={styles.textarea}
                placeholder="Бүлгийн агуулгыг энд бичнэ үү..."
                required
              />
            </div>
          ) : (
            <div className={styles.editorRow}>
              <div className={styles.editorCol}>
                <label className={styles.label}>Орчуулга</label>
                <textarea
                  name="content"
                  value={formData.content}
                  onChange={handleChange}
                  className={styles.textarea}
                  placeholder="Орчуулсан агуулга..."
                  required
                />
              </div>
              <div className={styles.editorCol}>
                <label className={styles.label}>Эх хувилбар <span className={styles.optional}>(заавал биш)</span></label>
                <textarea
                  name="originalContent"
                  value={formData.originalContent}
                  onChange={handleChange}
                  className={styles.textarea}
                  placeholder="Оригиналь агуулга..."
                />
              </div>
            </div>
          )}
        </div>

        <div className={styles.actions}>
          <button type="submit" className={styles.button} disabled={loading}>
            {loading ? (
              <>
                <span className={styles.spinner} />
                Хадгалж байна...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                Хадгалах
              </>
            )}
          </button>
          <Link
            href={`${basePath}/novels/${novelId}/chapters`}
            className={styles.secondaryButton}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            Цуцлах
          </Link>
        </div>
      </form>
    </>
  );
}
