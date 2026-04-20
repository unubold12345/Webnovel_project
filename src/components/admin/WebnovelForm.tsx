"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useToast } from "@/components/ui/ToastContext";
import styles from "./WebnovelForm.module.css";

interface NovelFormProps {
  initialData?: {
    id: string;
    title: string;
    slug: string;
    author: string;
    translator: string | null;
    summary: string;
    thumbnail: string;
    novelType: string;
    status: string;
    translationStatus: string;
    totalChapters: number;
    totalVolumes: number;
  };
  basePath?: string;
}

export default function WebnovelForm({ initialData, basePath = "/admin" }: NovelFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [thumbnailPreview, setThumbnailPreview] = useState(initialData?.thumbnail || "");
  const { addToast } = useToast();
  const [formData, setFormData] = useState({
    title: initialData?.title || "",
    slug: initialData?.slug || "",
    author: initialData?.author || "",
    translator: initialData?.translator || "",
    summary: initialData?.summary || "",
    thumbnail: initialData?.thumbnail || "",
    novelType: initialData?.novelType || "webnovel",
    status: initialData?.status || "ongoing",
    translationStatus: initialData?.translationStatus || "ongoing",
    totalChapters: initialData?.totalChapters || 0,
    totalVolumes: initialData?.totalVolumes || 0,
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    const numericValue = (name === "totalChapters" || name === "totalVolumes")
      ? (value === "" ? "" : Number(value))
      : value;
    setFormData({ ...formData, [name]: numericValue });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formDataUpload = new FormData();
    formDataUpload.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formDataUpload,
      });

      if (res.ok) {
        const data = await res.json();
        setFormData({ ...formData, thumbnail: data.url });
        setThumbnailPreview(data.url);
        addToast("Зураг амжилттай орууллаа", "success");
      } else {
        addToast("Зураг оруулахад алдаа гарлаа", "error");
      }
    } catch {
      addToast("Зураг оруулахад алдаа гарлаа", "error");
    }
    setUploading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const method = initialData ? "PUT" : "POST";
    const url = initialData
      ? `/api/admin/novels/${initialData.id}`
      : "/api/admin/novels";

    const submitData = {
      ...formData,
      totalChapters: formData.novelType === "light_novel" ? 0 : formData.totalChapters,
      totalVolumes: formData.novelType === "light_novel" ? formData.totalVolumes : 0,
    };

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitData),
      });

      if (res.ok) {
        const novel = await res.json();
        if (initialData) {
          addToast("Зохиол амжилттай шинэчлэгдлээ", "success");
        } else {
          addToast("Зохиол амжилттай нэмэгдлээ", "success");
        }
        setTimeout(() => {
          if (initialData) {
            router.push(`${basePath}/novels`);
          } else if (formData.novelType === "light_novel") {
            router.push(`${basePath}/novels/${novel.id}/volumes`);
          } else {
            router.push(`${basePath}/novels/${novel.id}/chapters`);
          }
        }, 1500);
      } else {
        const error = await res.json();
        addToast(error.message || "Зохиол хадгалахад алдаа гарлаа", "error");
      }
    } catch {
      addToast("Зохиол хадгалахад алдаа гарлаа", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.field}>
          <label className={styles.label}>Гарчиг</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            className={styles.input}
            required
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Slug</label>
          <input
            type="text"
            name="slug"
            value={formData.slug}
            onChange={handleChange}
            className={styles.input}
            required
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Зохиолч</label>
          <input
            type="text"
            name="author"
            value={formData.author}
            onChange={handleChange}
            className={styles.input}
            required
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Орчуулагч</label>
          <input
            type="text"
            name="translator"
            value={formData.translator}
            onChange={handleChange}
            className={styles.input}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Товч агуулга</label>
          <textarea
            name="summary"
            value={formData.summary}
            onChange={handleChange}
            className={styles.textarea}
            required
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Нүүр зураг</label>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className={styles.fileInput}
          />
          {uploading && <p>Оруулж байна...</p>}
          {thumbnailPreview && (
            <div className={styles.preview}>
              <Image
                src={thumbnailPreview}
                alt="Preview"
                width={200}
                height={280}
                style={{ objectFit: "cover" }}
              />
            </div>
          )}
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Төрөл</label>
          <select
            name="novelType"
            value={formData.novelType}
            onChange={handleChange}
            className={styles.select}
          >
            <option value="webnovel">Webnovel</option>
            <option value="light_novel">Light Novel</option>
          </select>
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Төлөв</label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            className={styles.select}
          >
            <option value="ongoing">Үргэлжилж буй</option>
            <option value="completed">Дууссан</option>
          </select>
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Орчуулгын төлөв</label>
          <select
            name="translationStatus"
            value={formData.translationStatus}
            onChange={handleChange}
            className={styles.select}
          >
            <option value="ongoing">Үргэлжилж буй</option>
            <option value="completed">Дууссан</option>
          </select>
        </div>
        {formData.novelType === "light_novel" ? (
          <div className={styles.field}>
            <label className={styles.label}>Нийт боть</label>
            <input
              type="number"
              name="totalVolumes"
              value={formData.totalVolumes}
              onChange={handleChange}
              className={styles.input}
              min="0"
            />
          </div>
        ) : (
          <div className={styles.field}>
            <label className={styles.label}>Нийт бүлэг</label>
            <input
              type="number"
              name="totalChapters"
              value={formData.totalChapters}
              onChange={handleChange}
              className={styles.input}
              min="0"
            />
          </div>
        )}
        <div className={styles.actions}>
          <button type="submit" className={styles.button} disabled={loading}>
            {loading ? "Хадгалж байна..." : "Хадгалах"}
          </button>
        </div>
      </form>
    </>
  );
}
