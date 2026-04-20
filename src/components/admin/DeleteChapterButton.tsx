"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/ToastContext";
import ConfirmModal from "@/components/ui/ConfirmModal";
import styles from "./DeleteChapterButton.module.css";

interface DeleteChapterButtonProps {
  novelId: string;
  chapterId: string;
  chapterTitle: string;
  chapterNumber: number;
  volumeId?: string;
}

export default function DeleteChapterButton({ 
  novelId, 
  chapterId, 
  chapterTitle, 
  chapterNumber,
  volumeId 
}: DeleteChapterButtonProps) {
  const [deleting, setDeleting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { addToast } = useToast();

  const handleDelete = async () => {
    setIsModalOpen(false);
    setDeleting(true);
    try {
      const url = volumeId 
        ? `/api/admin/novels/${novelId}/volumes/${volumeId}/chapters/${chapterId}`
        : `/api/admin/novels/${novelId}/chapters/${chapterId}`;
      const res = await fetch(url, { method: "DELETE" });
      if (res.ok) {
        addToast("Бүлэг амжилттай устгагдлаа", "success");
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        const error = await res.json();
        addToast(error.message || "Бүлэг устгахад алдаа гарлаа", "error");
      }
    } catch {
      addToast("Бүлэг устгахад алдаа гарлаа", "error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        disabled={deleting}
        className={styles.deleteButton}
      >
        {deleting ? "Устгаж байна..." : "Устгах"}
      </button>
      
      <ConfirmModal
        isOpen={isModalOpen}
        title="Бүлэг устгах"
        message={`#${chapterNumber} - "${chapterTitle}" бүлгийг устгахдаа итгэлтэй байна уу? Энэ үйлдэл буцаагдахгүй.`}
        confirmText="Устгах"
        cancelText="Цуцлах"
        confirmButtonClass="danger"
        onConfirm={handleDelete}
        onCancel={() => setIsModalOpen(false)}
      />
    </>
  );
}
