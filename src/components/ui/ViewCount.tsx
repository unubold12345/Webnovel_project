"use client";

import { useEffect, useRef } from "react";

interface ViewCountProps {
  novelId: string;
  volumeNumber: number;
  chapterNumber: number;
}

export default function ViewCount({ novelId, volumeNumber, chapterNumber }: ViewCountProps) {
  const hasTracked = useRef(false);

  useEffect(() => {
    // Prevent double tracking in React StrictMode
    if (hasTracked.current) return;
    hasTracked.current = true;

    const trackView = async () => {
      try {
        const response = await fetch(
          `/api/novels/${novelId}/volumes/${volumeNumber}/chapters/${chapterNumber}/view`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
        
        if (!response.ok) {
          console.error("Failed to track view:", await response.text());
        } else {
          const data = await response.json();
          console.log("View tracked successfully:", data);
        }
      } catch (error) {
        console.error("Error tracking view:", error);
      }
    };

    // Small delay to ensure the page has loaded
    const timer = setTimeout(trackView, 1000);
    
    return () => clearTimeout(timer);
  }, [novelId, volumeNumber, chapterNumber]);

  return null;
}
