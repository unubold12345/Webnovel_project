"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useToast } from "@/components/ui/ToastContext";
import styles from "./VolumeChapterForm.module.css";

interface ContentImage {
  id: string;
  url: string;
  position: number;
}

interface VolumeChapterFormProps {
  novelId: string;
  volumeId: string;
  nextChapterNumber?: number;
  basePath?: string;
  initialData?: {
    id: string;
    chapterNumber: number;
    title: string;
    content: string;
    contentImages: ContentImage[];
    images: string[];
  };
}

export default function VolumeChapterForm({
  novelId,
  volumeId,
  nextChapterNumber = 0,
  basePath = "/admin",
  initialData,
}: VolumeChapterFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const { addToast } = useToast();

  const [formData, setFormData] = useState({
    chapterNumber: initialData?.chapterNumber ?? nextChapterNumber,
    title: initialData?.title ?? "",
    content: initialData?.content ?? "",
    contentImages: initialData?.contentImages ?? [],
    images: initialData?.images ?? [],
  });

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "content" | "gallery"
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(type);

    for (let i = 0; i < files.length; i++) {
      const formDataUpload = new FormData();
      formDataUpload.append("file", files[i]);

      try {
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formDataUpload,
        });

        if (res.ok) {
          const data = await res.json();

          if (type === "content") {
            // For content images, add at the current cursor position or end
            const newImage: ContentImage = {
              id: `img_${Date.now()}_${i}`,
              url: data.url,
              position: formData.contentImages.length,
            };
            setFormData((prev) => ({
              ...prev,
              contentImages: [...prev.contentImages, newImage],
            }));
          } else {
            setFormData((prev) => ({
              ...prev,
              images: [...prev.images, data.url],
            }));
          }
          addToast("Зураг амжилттай орууллаа", "success");
        } else {
          addToast("Зураг оруулахад алдаа гарлаа", "error");
        }
      } catch {
        addToast("Зураг оруулахад алдаа гарлаа", "error");
      }
    }

    setUploading(null);
    // Reset the file input
    e.target.value = "";
  };

  const handleRemoveContentImage = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      contentImages: prev.contentImages.filter((img) => img.id !== id),
    }));
  };

  const handleRemoveGalleryImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const value =
      e.target.name === "chapterNumber"
        ? Number(e.target.value)
        : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  const insertImagePlaceholder = (imageId: string) => {
    const placeholder = `[IMAGE:${imageId}]`;
    const textarea = document.getElementById("content") as HTMLTextAreaElement;

    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = formData.content;
      const before = text.substring(0, start);
      const after = text.substring(end, text.length);

      setFormData((prev) => ({
        ...prev,
        content: before + placeholder + after,
      }));

      // Update cursor position after placeholder
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + placeholder.length;
        textarea.focus();
      }, 0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const url = initialData
      ? `/api/admin/novels/${novelId}/volumes/${volumeId}/chapters/${initialData.id}`
      : `/api/admin/novels/${novelId}/volumes/${volumeId}/chapters`;

    const method = initialData ? "PATCH" : "POST";

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
          router.push(`${basePath}/novels/${novelId}/volumes/${volumeId}/chapters`);
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
          <label className={styles.label}>Бүлгийн дугаар</label>
          <input
            type="number"
            name="chapterNumber"
            value={formData.chapterNumber}
            onChange={handleChange}
            className={styles.input}
            required
            min={0}
            step="0.1"
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

        {/* Content Text Area */}
        <div className={styles.field}>
          <label className={styles.label}>Агуулга</label>
          <textarea
            id="content"
            name="content"
            value={formData.content}
            onChange={handleChange}
            className={styles.textarea}
            rows={15}
            placeholder="Бүлгийн агуулгыг энд бичнэ үү..."
            required
          />
          <p className={styles.hint}>
            Зургаа агуулгын дунд оруулахыг хүсвэл зургийн доорхи товчийг дарна уу.
          </p>
        </div>

        {/* Content Images (Inline) */}
        <div className={styles.field}>
          <label className={styles.label}>Агуулгын дундах зургууд</label>
          <input
            type="file"
            onChange={(e) => handleImageUpload(e, "content")}
            accept="image/*"
            multiple
            className={styles.fileInput}
            disabled={uploading === "content"}
          />
          {uploading === "content" && <p className={styles.uploading}>Оруулж байна...</p>}

          {formData.contentImages.length > 0 && (
            <div className={styles.contentImagesSection}>
              <p className={styles.subLabel}>Оруулсан зургууд (дунд нь оруулахыг хүсвэл товчин дээр дар):</p>
              <div className={styles.imageGrid}>
                {formData.contentImages.map((img) => (
                  <div key={img.id} className={styles.contentImageItem}>
                    <Image
                      src={img.url}
                      alt={`Content image ${img.position + 1}`}
                      width={150}
                      height={200}
                      style={{ objectFit: "contain" }}
                    />
                    <div className={styles.contentImageActions}>
                      <button
                        type="button"
                        onClick={() => insertImagePlaceholder(img.id)}
                        className={styles.insertBtn}
                        title="Insert into content"
                      >
                        ➕ Оруулах
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveContentImage(img.id)}
                        className={styles.removeBtn}
                        title="Remove"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Gallery Images */}
        <div className={styles.field}>
          <label className={styles.label}>Нэмэлт зургууд (Gallery)</label>
          <input
            type="file"
            onChange={(e) => handleImageUpload(e, "gallery")}
            accept="image/*"
            multiple
            className={styles.fileInput}
            disabled={uploading === "gallery"}
          />
          {uploading === "gallery" && <p className={styles.uploading}>Оруулж байна...</p>}
          {formData.images.length > 0 && (
            <div className={styles.imageGrid}>
              {formData.images.map((img, index) => (
                <div key={index} className={styles.imageItem}>
                  <Image
                    src={img}
                    alt={`Gallery ${index + 1}`}
                    width={150}
                    height={200}
                    style={{ objectFit: "contain" }}
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveGalleryImage(index)}
                    className={styles.removeBtn}
                    title="Remove"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={styles.actions}>
          <button type="submit" className={styles.button} disabled={loading}>
            {loading ? "Хадгалж байна..." : initialData ? "Шинэчлэх" : "Хадгалах"}
          </button>
          <button
            type="button"
            onClick={() => router.push(`${basePath}/novels/${novelId}/volumes/${volumeId}/chapters`)}
            className={styles.cancelButton}
          >
            Болих
          </button>
        </div>
      </form>
    </>
  );
}
