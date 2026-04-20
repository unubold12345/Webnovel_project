"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";

interface SaveProgressProps {
  novelId: string;
  chapterId?: string;
  chapterNumber: number;
  volumeChapterId?: string;
  volumeId?: string;
  isVolumeChapter?: boolean;
}

export default function SaveProgress({ 
  novelId, 
  chapterId, 
  chapterNumber,
  volumeChapterId,
  volumeId,
  isVolumeChapter = false 
}: SaveProgressProps) {
  const { data: session } = useSession();

  useEffect(() => {
    if (session?.user?.id) {
      const body: Record<string, string | number | boolean> = { 
        novelId, 
        chapterNumber 
      };
      
      if (isVolumeChapter) {
        body.isVolumeChapter = true;
        if (volumeChapterId) body.volumeChapterId = volumeChapterId;
        if (volumeId) body.volumeId = volumeId;
      } else {
        if (chapterId) body.chapterId = chapterId;
      }
      
      fetch("/api/reading-progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).catch(() => {});
    }
  }, [session, novelId, chapterId, chapterNumber, volumeChapterId, volumeId, isVolumeChapter]);

  return null;
}