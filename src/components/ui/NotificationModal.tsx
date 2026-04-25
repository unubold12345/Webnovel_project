"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import styles from "./NotificationModal.module.css";

interface NotificationModalProps {
  isOpen: boolean;
  recipientLabel: string;
  onSend: (message: string, link: string) => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function NotificationModal({
  isOpen,
  recipientLabel,
  onSend,
  onCancel,
  loading = false,
}: NotificationModalProps) {
  const [mounted, setMounted] = useState(false);
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      setMessage("");
      setLink("");
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const canSend = message.trim().length > 0 && !loading;

  const modalContent = (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>Мэдэгдэл илгээх</h3>
          <button className={styles.closeButton} onClick={onCancel} aria-label="Хаах">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div className={styles.body}>
          <div className={styles.field}>
            <label className={styles.label}>Хүлээн авагч</label>
            <span className={styles.recipient}>{recipientLabel}</span>
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="notif-message">
              Мэдэгдэл <span className={styles.required}>*</span>
            </label>
            <textarea
              id="notif-message"
              className={styles.textarea}
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Мэдэгдлийн агуулга..."
              maxLength={500}
            />
            <span className={styles.charCount}>{message.length}/500</span>
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="notif-link">
              Холбоос (заавал биш)
            </label>
            <input
              id="notif-link"
              type="text"
              className={styles.input}
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://..."
            />
          </div>
        </div>
        <div className={styles.footer}>
          <button className={styles.cancelButton} onClick={onCancel} disabled={loading}>
            Цуцлах
          </button>
          <button
            className={styles.sendButton}
            onClick={() => onSend(message.trim(), link.trim())}
            disabled={!canSend}
          >
            {loading ? (
              <span className={styles.spinner} />
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
                Илгээх
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
