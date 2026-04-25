"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useToast } from "@/components/ui/ToastContext";
import styles from "./VolumeForm.module.css";

interface VolumeFormProps {
  novelId: string;
  nextVolumeNumber?: number;
  basePath?: string;
  initialData?: {
    id: string;
    volumeNumber: number;
    title: string;
    thumbnail?: string | null;
  };
}

export default function VolumeForm({ 
  novelId, 
  nextVolumeNumber = 1, 
  basePath = "/admin",
  initialData 
}: VolumeFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { addToast } = useToast();
  
  const [formData, setFormData] = useState({
    volumeNumber: initialData?.volumeNumber ?? nextVolumeNumber,
    title: initialData?.title ?? "",
    thumbnail: initialData?.thumbnail ?? "",
  });

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);

    const formDataUpload = new FormData();
    formDataUpload.append("file", files[0]);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formDataUpload,
      });

      if (res.ok) {
        const data = await res.json();
        setFormData((prev) => ({ ...prev, thumbnail: data.url }));
        addToast("Зураг амжилттай орууллаа", "success");
      } else {
        addToast("Зураг оруулахад алдаа гарлаа", "error");
      }
    } catch {
      addToast("Зураг оруулахад алдаа гарлаа", "error");
    }

    setUploading(false);
    e.target.value = "";
  };

  const handleRemoveThumbnail = () => {
    setFormData((prev) => ({ ...prev, thumbnail: "" }));
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value =
      e.target.name === "volumeNumber"
        ? Number(e.target.value)
        : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const url = initialData 
      ? `/api/admin/novels/${novelId}/volumes/${initialData.id}`
      : `/api/admin/novels/${novelId}/volumes`;
    
    const method = initialData ? "PATCH" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        if (initialData) {
          addToast("Боть амжилттай шинэчлэгдлээ", "success");
        } else {
          addToast("Боть амжилттай нэмэгдлээ", "success");
        }
        setTimeout(() => {
          router.push(`${basePath}/novels/${novelId}/volumes`);
          router.refresh();
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
              <label className={styles.label}>Ботьийн дугаар</label>
              <input
                type="number"
                name="volumeNumber"
                value={formData.volumeNumber}
                onChange={handleChange}
                className={styles.input}
                required
                min={1}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Гарчиг</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className={styles.input}
                placeholder="Ботьийн гарчиг"
                required
              />
            </div>
          </div>
        </div>

        {/* Thumbnail Upload */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionNumber}>2</span>
            <h3 className={styles.sectionTitle}>Нүүр зураг</h3>
          </div>
          <div className={styles.field}>
            <div className={styles.uploadRow}>
              <div
                className={`${styles.uploadZone} ${formData.thumbnail ? styles.uploadZoneHasImage : ""}`}
                onClick={() => document.getElementById("vol-thumb")?.click()}
                role="button"
                tabIndex={0}
              >
                <input
                  id="vol-thumb"
                  type="file"
                  onChange={handleThumbnailUpload}
                  accept="image/*"
                  className={styles.fileInput}
                  disabled={uploading}
                />
                {formData.thumbnail ? (
                  <div className={styles.preview}>
                    <Image
                      src={formData.thumbnail}
                      alt="Thumbnail"
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
              {formData.thumbnail && (
                <button
                  type="button"
                  onClick={handleRemoveThumbnail}
                  className={styles.removeThumbBtn}
                  title="Зураг устгах"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  Зураг устгах
                </button>
              )}
            </div>
            {uploading && <p className={styles.uploadingText}>Оруулж байна...</p>}
          </div>
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
                {initialData ? "Шинэчлэх" : "Хадгалах"}
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => router.push(`${basePath}/novels/${novelId}/volumes`)}
            className={styles.cancelButton}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            Болих
          </button>
        </div>
      </form>
    </>
  );
}
