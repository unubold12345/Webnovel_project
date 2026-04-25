"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { Toast, useToast } from "@/components/ui/Toast";
import styles from "./page.module.css";

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  avatar: string | null;
  coins: number;
  subscriptionPlan: string | null;
  subscriptionExpiresAt: string | null;
  createdAt: string;
}

interface SubscriptionHistoryItem {
  id: string;
  plan: string;
  action: string;
  grantedBy: string | null;
  durationMinutes: number | null;
  coinsGranted: number | null;
  createdAt: string;
}

const QUICK_DURATIONS = [
  { label: "1 мин", value: 1, unit: "minute" },
  { label: "5 мин", value: 5, unit: "minute" },
  { label: "1 цаг", value: 1, unit: "hour" },
  { label: "1 өдөр", value: 1, unit: "day" },
  { label: "7 хоног", value: 7, unit: "day" },
  { label: "30 хоног", value: 30, unit: "day" },
];

export default function AdminSubscriptionsPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string>("simple");
  const [customMinutes, setCustomMinutes] = useState<string>("");
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyUser, setHistoryUser] = useState<User | null>(null);
  const [historyData, setHistoryData] = useState<SubscriptionHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, [search, page]);

  const fetchUsers = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    params.append("page", page.toString());

    const res = await fetch(`/api/admin/users?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users);
      setTotalPages(data.totalPages);
      setTotalCount(data.totalCount);
    }
    setLoading(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const openGrantModal = (user: User) => {
    setSelectedUser(user);
    setSelectedPlan("simple");
    setCustomMinutes("");
    setModalOpen(true);
  };

  const handleQuickDuration = (value: number, unit: string) => {
    const now = new Date();
    let expiresAt = new Date(now);
    if (unit === "minute") expiresAt.setMinutes(now.getMinutes() + value);
    else if (unit === "hour") expiresAt.setHours(now.getHours() + value);
    else if (unit === "day") expiresAt.setDate(now.getDate() + value);

    const diffMs = expiresAt.getTime() - now.getTime();
    setCustomMinutes(Math.round(diffMs / 60000).toString());
  };

  const handleGrant = async () => {
    if (!selectedUser || !customMinutes) return;
    const minutes = parseInt(customMinutes, 10);
    if (isNaN(minutes) || minutes <= 0) {
      addToast("Зөвхөн эерэг тоо оруулна уу", "error");
      return;
    }

    setModalOpen(false);
    setActionLoading(selectedUser.id);

    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}/subscription`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: selectedPlan, minutes }),
      });

      if (res.ok) {
        const data = await res.json();
        setUsers(
          users.map((u) =>
            u.id === selectedUser.id
              ? { ...u, subscriptionPlan: data.plan, subscriptionExpiresAt: data.expiresAt }
              : u
          )
        );
        addToast(
          `"${selectedUser.username}" хэрэглэгчид ${selectedPlan} төлөвлөгөө ${minutes} минут олголоо`,
          "success"
        );
      } else {
        const data = await res.json();
        addToast(data.error || "Төлөвлөгөө олгоход алдаа гарлаа", "error");
      }
    } catch {
      addToast("Төлөвлөгөө олгоход алдаа гарлаа", "error");
    } finally {
      setActionLoading(null);
      setSelectedUser(null);
      setCustomMinutes("");
    }
  };

  const handleRevoke = async (user: User) => {
    if (!confirm(`"${user.username}" хэрэглэгчийн захиалгыг цуцлах уу?`)) return;

    setActionLoading(user.id);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/subscription`, {
        method: "DELETE",
      });

      if (res.ok) {
        setUsers(
          users.map((u) =>
            u.id === user.id ? { ...u, subscriptionPlan: null, subscriptionExpiresAt: null } : u
          )
        );
        addToast(`"${user.username}" хэрэглэгчийн захиалга цуцлагдлаа`, "success");
      } else {
        addToast("Захиалга цуцлахад алдаа гарлаа", "error");
      }
    } catch {
      addToast("Захиалга цуцлахад алдаа гарлаа", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const openHistoryModal = async (user: User) => {
    setHistoryUser(user);
    setHistoryModalOpen(true);
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/subscription-history`);
      if (res.ok) {
        const data = await res.json();
        setHistoryData(data.history);
      } else {
        addToast("Түүх ачаалахад алдаа гарлаа", "error");
      }
    } catch {
      addToast("Түүх ачаалахад алдаа гарлаа", "error");
    } finally {
      setHistoryLoading(false);
    }
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return true;
    return new Date(expiresAt) < new Date();
  };

  const formatExpiry = (expiresAt: string | null) => {
    if (!expiresAt) return "-";
    const d = new Date(expiresAt);
    const now = new Date();
    const diffMs = d.getTime() - now.getTime();
    if (diffMs < 0) return "Дууссан";
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 60) return `${diffMins} минут үлдлээ`;
    if (diffHours < 24) return `${diffHours} цаг үлдлээ`;
    return `${diffDays} хоног үлдлээ`;
  };

  if (session?.user?.role !== "admin") {
    return (
      <div className={styles.container}>
        <p className={styles.empty}>Хандах эрхгүй. Зөвхөн админ хандана.</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Сарын захиалга</h1>
      </div>

      <form onSubmit={handleSearch} className={styles.searchForm}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Хэрэглэгчийн нэр эсвэл имэйлээр хайх..."
          className={styles.searchInput}
        />
        <button type="submit" className={styles.searchButton}>
          Хайх
        </button>
      </form>

      <div className={styles.list}>
        {loading ? (
          <p className={styles.loading}>Ачаалж байна...</p>
        ) : users.length === 0 ? (
          <p className={styles.empty}>Хэрэглэгч олдсонгүй</p>
        ) : (
          <>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Хэрэглэгч</th>
                  <th>Имэйл</th>
                  <th>Зоос</th>
                  <th>Төлөвлөгөө</th>
                  <th>Үлдсэн хугацаа</th>
                  <th>Үйлдэл</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td data-label="Хэрэглэгч">
                      <div className={styles.userCell}>
                        {user.avatar ? (
                          <Image
                            src={user.avatar}
                            alt={user.username}
                            width={32}
                            height={32}
                            className={styles.avatar}
                          />
                        ) : (
                          <div className={styles.avatarPlaceholder}>
                            {user.username.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span>{user.username}</span>
                      </div>
                    </td>
                    <td data-label="Имэйл">{user.email}</td>
                    <td data-label="Зоос">
                      <span className={styles.coinValue}>{user.coins}</span>
                    </td>
                    <td data-label="Төлөвлөгөө">
                      {user.subscriptionPlan && !isExpired(user.subscriptionExpiresAt) ? (
                        <span
                          className={`${styles.planBadge} ${
                            user.subscriptionPlan === "medium" ? styles.mediumPlan : styles.simplePlan
                          }`}
                        >
                          {user.subscriptionPlan === "simple" ? "Simple" : "Medium"}
                        </span>
                      ) : (
                        <span className={styles.noPlan}>-</span>
                      )}
                    </td>
                    <td data-label="Үлдсэн хугацаа">
                      {user.subscriptionPlan && !isExpired(user.subscriptionExpiresAt) ? (
                        <span className={styles.timeLeft}>{formatExpiry(user.subscriptionExpiresAt)}</span>
                      ) : (
                        <span className={styles.noPlan}>-</span>
                      )}
                    </td>
                    <td className={styles.actions}>
                      <button
                        onClick={() => openGrantModal(user)}
                        disabled={actionLoading === user.id}
                        className={styles.grantButton}
                      >
                        Олгох
                      </button>
                      {user.subscriptionPlan && !isExpired(user.subscriptionExpiresAt) && (
                        <button
                          onClick={() => handleRevoke(user)}
                          disabled={actionLoading === user.id}
                          className={styles.revokeButton}
                        >
                          Цуцлах
                        </button>
                      )}
                      <button
                        onClick={() => openHistoryModal(user)}
                        disabled={actionLoading === user.id}
                        className={styles.historyButton}
                      >
                        Түүх
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className={styles.pagination}>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className={styles.pageButton}
                >
                  Өмнөх
                </button>
                <span className={styles.pageInfo}>
                  Хуудас {page} / {totalPages} (Нийт {totalCount})
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className={styles.pageButton}
                >
                  Дараах
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {modalOpen && selectedUser && (
        <div className={styles.modalOverlay} onClick={() => setModalOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>
              {selectedUser.username} - Төлөвлөгөө олгох
            </h2>
            <p className={styles.modalSubtitle}>
              Одоо: {selectedUser.subscriptionPlan && !isExpired(selectedUser.subscriptionExpiresAt) ? (selectedUser.subscriptionPlan === "simple" ? "Simple" : "Medium") : "Төлөвлөгөөгүй"}
            </p>

            <div className={styles.planSelect}>
              <label className={styles.planOption}>
                <input
                  type="radio"
                  name="plan"
                  value="simple"
                  checked={selectedPlan === "simple"}
                  onChange={() => setSelectedPlan("simple")}
                />
                <span className={styles.planOptionLabel}>Simple (20,000 зоос)</span>
              </label>
              <label className={styles.planOption}>
                <input
                  type="radio"
                  name="plan"
                  value="medium"
                  checked={selectedPlan === "medium"}
                  onChange={() => setSelectedPlan("medium")}
                />
                <span className={styles.planOptionLabel}>Medium (30,000 зоос)</span>
              </label>
            </div>

            <div className={styles.quickAmounts}>
              {QUICK_DURATIONS.map((d) => (
                <button
                  key={d.label}
                  onClick={() => handleQuickDuration(d.value, d.unit)}
                  className={`${styles.quickAmountButton} ${
                    customMinutes === getMinutesForDuration(d).toString() ? styles.active : ""
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>

            <input
              type="number"
              value={customMinutes}
              onChange={(e) => setCustomMinutes(e.target.value)}
              placeholder="Минутаар хугацаа оруулах..."
              className={styles.coinInput}
              min="1"
            />

            <div className={styles.modalActions}>
              <button onClick={() => setModalOpen(false)} className={styles.cancelButton}>
                Цуцлах
              </button>
              <button
                onClick={handleGrant}
                disabled={!customMinutes || parseInt(customMinutes, 10) <= 0}
                className={styles.confirmButton}
              >
                Олгох
              </button>
            </div>
          </div>
        </div>
      )}

      {historyModalOpen && historyUser && (
        <div className={styles.modalOverlay} onClick={() => setHistoryModalOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>
              {historyUser.username} - Захиалгын түүх
            </h2>

            {historyLoading ? (
              <p className={styles.loading}>Ачаалж байна...</p>
            ) : historyData.length === 0 ? (
              <p className={styles.empty}>Түүх олдсонгүй</p>
            ) : (
              <table className={styles.historyTable}>
                <thead>
                  <tr>
                    <th>Багц</th>
                    <th>Үйлдэл</th>
                    <th>Хугацаа</th>
                    <th>Зоос</th>
                    <th>Огноо</th>
                  </tr>
                </thead>
                <tbody>
                  {historyData.map((h) => (
                    <tr key={h.id}>
                      <td>
                        <span className={`${styles.planBadge} ${h.plan === "medium" ? styles.mediumPlan : styles.simplePlan}`}>
                          {h.plan === "simple" ? "Simple" : "Medium"}
                        </span>
                      </td>
                      <td>
                        {h.action === "granted" && <span className={styles.actionGranted}>Олгосон</span>}
                        {h.action === "revoked" && <span className={styles.actionRevoked}>Цуцалсан</span>}
                        {h.action === "expired" && <span className={styles.actionExpired}>Дууссан</span>}
                      </td>
                      <td>{h.durationMinutes ? `${h.durationMinutes} мин` : "-"}</td>
                      <td>{h.coinsGranted ? `+${h.coinsGranted}` : "-"}</td>
                      <td>{new Date(h.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <div className={styles.modalActions}>
              <button onClick={() => setHistoryModalOpen(false)} className={styles.cancelButton}>
                Хаах
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getMinutesForDuration(d: { value: number; unit: string }) {
  if (d.unit === "minute") return d.value;
  if (d.unit === "hour") return d.value * 60;
  if (d.unit === "day") return d.value * 60 * 24;
  return d.value;
}
