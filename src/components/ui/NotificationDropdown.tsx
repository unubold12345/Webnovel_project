"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import styles from "./NotificationDropdown.module.css";
import { useToast } from "@/components/ui/ToastContext";

interface Notification {
  id: string;
  type: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationDropdown() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();
  const seenIdsRef = useRef<Set<string>>(new Set());
  const isFirstFetchRef = useRef(true);

  useEffect(() => {
    fetchNotifications();
    checkSubscriptionExpiry();
    const interval = setInterval(() => {
      fetchNotifications();
      checkSubscriptionExpiry();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(`.${styles.notificationWrapper}`)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data: Notification[] = await res.json();
        setNotifications(data);

        if (isFirstFetchRef.current) {
          // Mark all existing notifications as seen on first load
          data.forEach((n) => seenIdsRef.current.add(n.id));
          isFirstFetchRef.current = false;
        } else {
          // Find new unread notifications
          const newNotifications = data.filter(
            (n) => !n.isRead && !seenIdsRef.current.has(n.id)
          );
          newNotifications.forEach((n) => {
            seenIdsRef.current.add(n.id);
            if (n.type === "comment_like" || n.type === "comment_reply") {
              return;
            }
            if (n.type === "topup") {
              addToast(n.message, "success", 6000);
            } else if (n.type === "subscription_expired") {
              addToast(n.message, "warning", 8000);
            } else {
              addToast(n.message, "info", 5000);
            }
          });
        }
      }
    } catch {}
  };

  const checkSubscriptionExpiry = async () => {
    try {
      await fetch("/api/notifications/check-subscription", { method: "POST" });
    } catch {}
  };

  const markAllRead = async () => {
    setLoading(true);
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
    } finally {
      setLoading(false);
    }
  };

  const deleteNotification = async (notificationId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await fetch(`/api/notifications?id=${notificationId}`, {
        method: "DELETE",
      });
      setNotifications(notifications.filter(n => n.id !== notificationId));
    } catch {}
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const formatTime = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Дөнгөж сая";
    if (diffMins < 60) return `${diffMins} минутын өмнө`;
    if (diffHours < 24) return `${diffHours} цагийн өмнө`;
    if (diffDays < 7) return `${diffDays} хоногийн өмнө`;
    return d.toLocaleDateString();
  };

  return (
    <div className={styles.notificationWrapper}>
      <button
        className={styles.bellButton}
        onClick={() => setShowDropdown(!showDropdown)}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className={styles.badge}>{unreadCount > 9 ? "9+" : unreadCount}</span>
        )}
      </button>

      {showDropdown && (
        <div className={styles.dropdown}>
          <div className={styles.dropdownHeader}>
            <span>Мэдэгдлүүд</span>
            {unreadCount > 0 && (
              <button onClick={markAllRead} disabled={loading} className={styles.markAllRead}>
                Бүгдийг уншсан гэж тэмдэглэх
              </button>
            )}
          </div>
          <div className={styles.dropdownContent}>
            {notifications.length === 0 ? (
              <p className={styles.empty}>Мэдэгдэл байхгүй</p>
            ) : (
notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`${styles.notificationItem} ${!notification.isRead ? styles.unread : ""}`}
                >
                  <Link
                    href={notification.link || "#"}
                    className={styles.notificationLink}
                    onClick={() => {
                      setShowDropdown(false);
                      const link = notification.link;
                      if (link && link.includes("#")) {
                        const path = link.split("#")[0];
                        if (window.location.pathname === path) {
                          window.location.hash = "";
                          setTimeout(() => {
                            window.location.hash = link.split("#")[1];
                          }, 50);
                        }
                      }
                    }}
                  >
                    <div className={styles.notificationContent}>
                      <p className={styles.message}>{notification.message}</p>
                      <span className={styles.time}>{formatTime(notification.createdAt)}</span>
                    </div>
                  </Link>
                  <button
                    className={styles.deleteButton}
                    onClick={(e) => deleteNotification(notification.id, e)}
                    title="Delete notification"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}