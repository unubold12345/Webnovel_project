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
            required
          />
        </div>

        {/* Thumbnail Upload */}
        <div className={styles.field}>
          <label className={styles.label}>Нүүр зураг (Thumbnail)</label>
          <input
            type="file"
            onChange={handleThumbnailUpload}
            accept="image/*"
            className={styles.fileInput}
            disabled={uploading}
          />
          {uploading && <p className={styles.uploading}>Оруулж байна...</p>}
          {formData.thumbnail && (
            <div className={styles.thumbnailPreview}>
              <div className={styles.imageItem}>
                <Image
                  src={formData.thumbnail}
                  alt="Thumbnail"
                  width={200}
                  height={280}
                  style={{ objectFit: "contain" }}
                />
                <button
                  type="button"
                  onClick={handleRemoveThumbnail}
                  className={styles.removeBtn}
                  title="Remove thumbnail"
                >
                  ✕
                </button>
              </div>
            </div>
          )}
        </div>

        <div className={styles.actions}>
          <button type="submit" className={styles.button} disabled={loading}>
            {loading ? "Хадгалж байна..." : initialData ? "Шинэчлэх" : "Хадгалах"}
          </button>
          <button
            type="button"
            onClick={() => router.push(`${basePath}/novels/${novelId}/volumes`)}
            className={styles.cancelButton}
          >
            Болих
          </button>
        </div>
      </form>
    </>
  );
}
