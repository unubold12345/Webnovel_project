"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import ReportModal from "./ReportModal";
import styles from "./ChapterReportButton.module.css";

interface ChapterReportButtonProps {
  chapterId: string;
  novelSlug: string;
  chapterNumber: number;
  volumeNumber?: number;
}

export default function ChapterReportButton({ chapterId, novelSlug, chapterNumber, volumeNumber }: ChapterReportButtonProps) {
  const { data: session } = useSession();
  const [showModal, setShowModal] = useState(false);

  if (!session?.user?.id) return null;

  return (
    <>
      <button onClick={() => setShowModal(true)} className={styles.reportButton}>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
          <line x1="4" y1="22" x2="4" y2="15" />
        </svg>
        Асуудал мэдээлэх
      </button>
      {showModal && (
        <ReportModal
          chapterId={chapterId}
          novelSlug={novelSlug}
          chapterNumber={chapterNumber}
          volumeNumber={volumeNumber}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}