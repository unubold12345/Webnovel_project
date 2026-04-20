"use client";

import { useState } from "react";
import styles from "./page.module.css";

export default function AdminDevToolsPage() {
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleDeleteAllComments = async () => {
    const confirmText = "TYPE 'DELETE' TO CONFIRM";
    const userInput = prompt(`⚠️ WARNING: This will delete ALL comments and comment likes!\n\nThis action cannot be undone.\n\nTo confirm, type: ${confirmText}`);

    if (userInput !== "DELETE") {
      setMessage({ type: "error", text: "Deletion cancelled. You must type 'DELETE' to confirm." });
      return;
    }

    setDeleting(true);
    setMessage(null);

    try {
      const res = await fetch("/api/dev/comments", {
        method: "DELETE",
      });

      if (res.ok) {
        const data = await res.json();
        setMessage({ type: "success", text: data.message });
      } else {
        const error = await res.json();
        setMessage({ type: "error", text: error.error || "Failed to delete comments" });
      }
    } catch {
      setMessage({ type: "error", text: "Network error. Please try again." });
    }

    setDeleting(false);
  };

  return (
    <div className={styles.devTools}>
      <div className={styles.header}>
        <h1 className={styles.title}>Dev Tools</h1>
        <span className={styles.badge}>Admin Only</span>
      </div>
      <div className={styles.content}>
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Comments Management</h3>
          <p className={styles.description}>
            Delete all comments and comment likes. Novels, chapters, and user accounts will NOT be affected.
          </p>
          <button
            onClick={handleDeleteAllComments}
            disabled={deleting}
            className={styles.dangerButton}
          >
            {deleting ? "Deleting..." : "Delete All Comments"}
          </button>
          {message && (
            <p className={`${styles.message} ${styles[message.type]}`}>
              {message.text}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}