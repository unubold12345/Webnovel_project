"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import styles from "./SaveNovelButton.module.css";

type ReadingStatus = "reading" | "completed" | "on_hold" | "plan_to_read" | "dropped";

interface SaveNovelButtonProps {
  novelId: string;
}

const statusConfig: Record<ReadingStatus, { label: string; icon: string; color: string }> = {
  reading: {
    label: "Уншиж байна",
    icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
    color: "#22c55e",
  },
  completed: {
    label: "Дуусгасан",
    icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
    color: "#3b82f6",
  },
  on_hold: {
    label: "Түр зогсоосон",
    icon: "M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z",
    color: "#f59e0b",
  },
  plan_to_read: {
    label: "Дараа унших",
    icon: "M12 6v6m0 0v6m0-6h6m-6 0H6",
    color: "#8b5cf6",
  },
  dropped: {
    label: "Орхисон",
    icon: "M6 18L18 6M6 6l12 12",
    color: "#ef4444",
  },
};

const statusOptions: ReadingStatus[] = ["reading", "completed", "on_hold", "plan_to_read", "dropped"];

export default function SaveNovelButton({ novelId }: SaveNovelButtonProps) {
  const { data: session, status } = useSession();
  const [isSaved, setIsSaved] = useState(false);
  const [readingStatus, setReadingStatus] = useState<ReadingStatus>("plan_to_read");
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.id) {
      checkSavedStatus();
    } else {
      setIsChecking(false);
    }
  }, [status, session, novelId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const checkSavedStatus = async () => {
    try {
      const res = await fetch(`/api/library/check?novelId=${novelId}`);
      if (res.ok) {
        const data = await res.json();
        setIsSaved(data.isSaved);
        if (data.readingStatus) {
          setReadingStatus(data.readingStatus);
        }
      }
    } catch (error) {
      console.error("Failed to check saved status:", error);
    } finally {
      setIsChecking(false);
    }
  };

  const handleSave = async (readingStatusParam: ReadingStatus = "plan_to_read") => {
    if (isLoading || status !== "authenticated") return;

    setIsLoading(true);
    try {
      const res = await fetch("/api/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ novelId, readingStatus: readingStatusParam }),
      });
      if (res.ok) {
        setIsSaved(true);
        setReadingStatus(readingStatusParam);
        setIsDropdownOpen(false);
      }
    } catch (error) {
      console.error("Failed to save novel:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: ReadingStatus) => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      const res = await fetch("/api/library", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ novelId, readingStatus: newStatus }),
      });
      if (res.ok) {
        setReadingStatus(newStatus);
        setIsDropdownOpen(false);
      }
    } catch (error) {
      console.error("Failed to update reading status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = async () => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      const res = await fetch(`/api/library/${novelId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setIsSaved(false);
        setReadingStatus("plan_to_read");
        setIsDropdownOpen(false);
      }
    } catch (error) {
      console.error("Failed to remove from library:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Don't show button if not authenticated or still checking
  if (status !== "authenticated" || isChecking) {
    return null;
  }

  const currentConfig = statusConfig[readingStatus];

  // If not saved, show simple save button
  if (!isSaved) {
    return (
      <div className={styles.container} ref={dropdownRef}>
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          disabled={isLoading}
          className={styles.saveButton}
        >
          {isLoading ? (
            <span className={styles.spinner}></span>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          )}
        </button>

        {isDropdownOpen && (
          <div className={styles.dropdown}>
            {statusOptions.map((statusOption) => (
              <button
                key={statusOption}
                onClick={() => handleSave(statusOption)}
                className={styles.dropdownItem}
                disabled={isLoading}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={statusConfig[statusOption].color}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d={statusConfig[statusOption].icon} />
                </svg>
                <span>{statusConfig[statusOption].label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // If saved, show status dropdown
  return (
    <div className={styles.container} ref={dropdownRef}>
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        disabled={isLoading}
        className={`${styles.saveButton} ${styles.saved}`}
        style={{ borderColor: currentConfig.color }}
      >
        {isLoading ? (
          <span className={styles.spinner}></span>
        ) : (
          <>
            <span style={{ color: currentConfig.color }}>{currentConfig.label}</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke={currentConfig.color}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
            </svg>
          </>
        )}
      </button>

      {isDropdownOpen && (
        <div className={styles.dropdown}>
          {statusOptions.map((statusOption) => (
            <button
              key={statusOption}
              onClick={() => handleStatusChange(statusOption)}
              className={`${styles.dropdownItem} ${readingStatus === statusOption ? styles.dropdownItemActive : ""}`}
              disabled={isLoading}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke={statusConfig[statusOption].color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d={statusConfig[statusOption].icon} />
              </svg>
              <span>{statusConfig[statusOption].label}</span>
              {readingStatus === statusOption && (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={styles.checkmark}
                >
                  <path d="M5 12l5 5L20 7" />
                </svg>
              )}
            </button>
          ))}
          <div className={styles.dropdownDivider} />
          <button
            onClick={handleRemove}
            className={`${styles.dropdownItem} ${styles.dropdownItemRemove}`}
            disabled={isLoading}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#ef4444"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span>Зохиолын сангаас хасах</span>
          </button>
        </div>
      )}
    </div>
  );
}
