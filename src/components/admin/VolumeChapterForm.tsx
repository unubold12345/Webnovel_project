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
    const value = e.target.value;
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

    // Prepare data with chapterNumber as float
    const submitData = {
      ...formData,
      chapterNumber: parseFloat(formData.chapterNumber as any),
    };

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitData),
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
                type="text"
                name="chapterNumber"
                value={formData.chapterNumber}
                onChange={handleChange}
                className={styles.input}
                required
                pattern="[0-9]+(\.[0-9]+)?"
                placeholder="Жишээ: 3, 3.1, 4.2"
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
          <div className={styles.field}>
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
        </div>

        {/* Content Images (Inline) */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionNumber}>3</span>
            <h3 className={styles.sectionTitle}>Агуулгын дундах зургууд</h3>
          </div>
          <div className={styles.field}>
            <div className={styles.uploadBox}>
              <input
                type="file"
                onChange={(e) => handleImageUpload(e, "content")}
                accept="image/*"
                multiple
                className={styles.fileInput}
                disabled={uploading === "content"}
                id="content-img-upload"
              />
              <label htmlFor="content-img-upload" className={styles.uploadLabel}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                <span>Зураг оруулах</span>
              </label>
            </div>
            {uploading === "content" && <p className={styles.uploadingText}>Оруулж байна...</p>}

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
                        style={{ objectFit: "cover" }}
                      />
                      <div className={styles.contentImageActions}>
                        <button
                          type="button"
                          onClick={() => insertImagePlaceholder(img.id)}
                          className={styles.insertBtn}
                          title="Insert into content"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                          Оруулах
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveContentImage(img.id)}
                          className={styles.removeBtn}
                          title="Remove"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Gallery Images */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionNumber}>4</span>
            <h3 className={styles.sectionTitle}>Нэмэлт зургууд (Gallery)</h3>
          </div>
          <div className={styles.field}>
            <div className={styles.uploadBox}>
              <input
                type="file"
                onChange={(e) => handleImageUpload(e, "gallery")}
                accept="image/*"
                multiple
                className={styles.fileInput}
                disabled={uploading === "gallery"}
                id="gallery-img-upload"
              />
              <label htmlFor="gallery-img-upload" className={styles.uploadLabel}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                <span>Зураг оруулах</span>
              </label>
            </div>
            {uploading === "gallery" && <p className={styles.uploadingText}>Оруулж байна...</p>}
            {formData.images.length > 0 && (
              <div className={styles.imageGrid}>
                {formData.images.map((img, index) => (
                  <div key={index} className={styles.imageItem}>
                    <Image
                      src={img}
                      alt={`Gallery ${index + 1}`}
                      width={150}
                      height={200}
                      style={{ objectFit: "cover" }}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveGalleryImage(index)}
                      className={styles.removeBtn}
                      title="Remove"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
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
            onClick={() => router.push(`${basePath}/novels/${novelId}/volumes/${volumeId}/chapters`)}
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
