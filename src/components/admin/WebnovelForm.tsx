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
    genres: string | null;
    novelType: string;
    status: string;
    translationStatus: string;
    totalChapters: number;
    totalVolumes: number;
  };
  basePath?: string;
  mode?: "admin" | "user";
}

export default function WebnovelForm({ initialData, basePath = "/admin", mode = "admin" }: NovelFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [thumbnailPreview, setThumbnailPreview] = useState(initialData?.thumbnail || "");
  const { addToast } = useToast();
  const isUserMode = mode === "user";
  const parseGenres = (genresStr?: string | null) =>
    genresStr?.split(",").map((g) => g.trim()).filter(Boolean) || [];

  const [genres, setGenres] = useState<string[]>(parseGenres(initialData?.genres));
  const [genreInput, setGenreInput] = useState("");

  const [formData, setFormData] = useState({
    title: initialData?.title || "",
    slug: initialData?.slug || "",
    author: initialData?.author || "",
    translator: initialData?.translator || "",
    summary: initialData?.summary || "",
    thumbnail: initialData?.thumbnail || "",
    novelType: isUserMode ? "webnovel" : (initialData?.novelType || "webnovel"),
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

  const addGenre = (value: string) => {
    const trimmed = value.trim();
    if (trimmed && !genres.includes(trimmed)) {
      setGenres([...genres, trimmed]);
    }
    setGenreInput("");
  };

  const removeGenre = (index: number) => {
    setGenres(genres.filter((_, i) => i !== index));
  };

  const handleGenreKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addGenre(genreInput);
    }
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
    const apiPrefix = isUserMode ? "/api/user" : "/api/admin";
    const url = initialData
      ? `${apiPrefix}/novels/${initialData.id}`
      : `${apiPrefix}/novels`;

    const submitData = {
      ...formData,
      genres: genres.join(","),
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
          } else if (formData.novelType === "light_novel" && !isUserMode) {
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
        {/* Cover Image — full width, visually prominent */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionNumber}>1</span>
            <h3 className={styles.sectionTitle}>Нүүр зураг</h3>
          </div>
          <div className={styles.field}>
            <div
              className={`${styles.uploadZone} ${thumbnailPreview ? styles.uploadZoneHasImage : ""}`}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className={styles.fileInput}
              />
              {thumbnailPreview ? (
                <div className={styles.preview}>
                  <Image
                    src={thumbnailPreview}
                    alt="Preview"
                    width={220}
                    height={310}
                    style={{ objectFit: "cover" }}
                  />
                  <div className={styles.previewOverlay}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    <span>Зураг солих</span>
                  </div>
                </div>
              ) : (
                <div className={styles.uploadPlaceholder}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                  <span className={styles.uploadText}>Зураг оруулах</span>
                  <span className={styles.uploadHint}>Эсвэл энд дарна уу</span>
                </div>
              )}
            </div>
            {uploading && <p className={styles.uploadingText}>Оруулж байна...</p>}
          </div>
        </div>

        {/* Basic Info */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionNumber}>2</span>
            <h3 className={styles.sectionTitle}>Ерөнхий мэдээлэл</h3>
          </div>
          <div className={styles.grid2}>
            <div className={styles.field}>
              <label className={styles.label}>Гарчиг</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className={styles.input}
                placeholder="Жишээ: Хар мангасын дайн"
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
                placeholder="har-mangasyn-dain"
                required
              />
            </div>
          </div>
          <div className={styles.grid2}>
            <div className={styles.field}>
              <label className={styles.label}>Зохиолч</label>
              {isUserMode && (
                <p className={styles.hint}>Өөрийн нэр эсвэл хэрэглэгчийн нэрээ ашиглаж болно</p>
              )}
              <input
                type="text"
                name="author"
                value={formData.author}
                onChange={handleChange}
                className={styles.input}
                placeholder="Зохиолчийн нэр"
                required
              />
            </div>
            {!isUserMode && (
              <div className={styles.field}>
                <label className={styles.label}>Орчуулагч</label>
                <input
                  type="text"
                  name="translator"
                  value={formData.translator}
                  onChange={handleChange}
                  className={styles.input}
                  placeholder="Орчуулагчийн нэр"
                />
              </div>
            )}
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Товч агуулга</label>
            <textarea
              name="summary"
              value={formData.summary}
              onChange={handleChange}
              className={styles.textarea}
              placeholder="Зохиолын товч агуулгыг энд бичнэ үү..."
              required
            />
          </div>
        </div>

        {/* Genres */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionNumber}>3</span>
            <h3 className={styles.sectionTitle}>Жанрууд</h3>
          </div>
          <div className={styles.field}>
            <div className={styles.genreTags}>
              {genres.map((genre, index) => (
                <span key={index} className={styles.genreTag}>
                  {genre}
                  <button
                    type="button"
                    onClick={() => removeGenre(index)}
                    className={styles.genreRemove}
                    aria-label="Жанр хасах"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </span>
              ))}
            </div>
            <input
              type="text"
              value={genreInput}
              onChange={(e) => setGenreInput(e.target.value)}
              onKeyDown={handleGenreKeyDown}
              onBlur={() => addGenre(genreInput)}
              placeholder="Жанр бичээд Enter эсвэл таслал дарна уу"
              className={styles.input}
            />
          </div>
        </div>

        {/* Status & Type */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionNumber}>4</span>
            <h3 className={styles.sectionTitle}>Төлөв ба төрөл</h3>
          </div>
          <div className={styles.grid2}>
            {!isUserMode && (
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
            )}
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
            {!isUserMode && (
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
            )}
          </div>
          {!isUserMode && (
            <div className={styles.grid2}>
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
        </div>
      </form>
    </>
  );
}
