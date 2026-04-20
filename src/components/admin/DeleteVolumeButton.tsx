"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/ToastContext";
import ConfirmModal from "@/components/ui/ConfirmModal";
import styles from "./DeleteVolumeButton.module.css";

interface DeleteVolumeButtonProps {
  novelId: string;
  volumeId: string;
  volumeTitle: string;
}

export default function DeleteVolumeButton({ novelId, volumeId, volumeTitle }: DeleteVolumeButtonProps) {
  const [deleting, setDeleting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { addToast } = useToast();

  const handleDelete = async () => {
    setIsModalOpen(false);
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/novels/${novelId}/volumes/${volumeId}`, { method: "DELETE" });
      if (res.ok) {
        addToast("Боть амжилттай устгагдлаа", "success");
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        const error = await res.json();
        addToast(error.message || "Боть устгахад алдаа гарлаа", "error");
      }
    } catch {
      addToast("Боть устгахад алдаа гарлаа", "error");
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
        title="Боть устгах"
        message={`"${volumeTitle}" ботийг устгахдаа итгэлтэй байна уу? Энэ үйлдэл буцаагдахгүй.`}
        confirmText="Устгах"
        cancelText="Цуцлах"
        confirmButtonClass="danger"
        onConfirm={handleDelete}
        onCancel={() => setIsModalOpen(false)}
      />
    </>
  );
}
