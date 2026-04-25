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
  isRestricted: boolean;
  lastActiveAt: string;
  avatar: string | null;
  bio: string | null;
  coins: number;
  createdAt: string;
  _count: {
    comments: number;
  };
}

interface CoinHistoryItem {
  id: string;
  amount: number;
  balance: number;
  type: string;
  description: string | null;
  createdAt: string;
  novel: { id: string; title: string; slug: string } | null;
  chapter: { id: string; chapterNumber: number; title: string } | null;
  volumeChapter: { id: string; chapterNumber: number; title: string } | null;
}

export default function AdminTopUpPage() {
  const { data: session, update } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [coinAmount, setCoinAmount] = useState<string>("");
  const { toasts, addToast, removeToast } = useToast();

  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyUser, setHistoryUser] = useState<User | null>(null);
  const [history, setHistory] = useState<CoinHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);

  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetUser, setResetUser] = useState<User | null>(null);

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

  const openTopUpModal = (user: User) => {
    setSelectedUser(user);
    setCoinAmount("");
    setModalOpen(true);
  };

  const openHistoryModal = async (user: User) => {
    setHistoryUser(user);
    setHistoryModalOpen(true);
    setHistoryLoading(true);
    setHistoryPage(1);
    try {
      const res = await fetch(`/api/users/${user.id}/coins/history?page=1&limit=20`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history);
        setHistoryTotalPages(data.totalPages);
      } else {
        addToast("Coin түүх ачаалахад алдаа гарлаа", "error");
      }
    } catch {
      addToast("Coin түүх ачаалахад алдаа гарлаа", "error");
    } finally {
      setHistoryLoading(false);
    }
  };

  const fetchHistoryPage = async (page: number) => {
    if (!historyUser) return;
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/users/${historyUser.id}/coins/history?page=${page}&limit=20`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history);
        setHistoryTotalPages(data.totalPages);
        setHistoryPage(page);
      } else {
        addToast("Coin түүх ачаалахад алдаа гарлаа", "error");
      }
    } catch {
      addToast("Coin түүх ачаалахад алдаа гарлаа", "error");
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleQuickAmount = (amount: number) => {
    setCoinAmount(amount.toString());
  };

  const openResetModal = (user: User) => {
    setResetUser(user);
    setResetModalOpen(true);
  };

  const confirmReset = async () => {
    if (!resetUser) return;
    setResetModalOpen(false);
    setActionLoading(resetUser.id);
    try {
      const res = await fetch(`/api/admin/users/${resetUser.id}/reset-chapters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (res.ok) {
        const data = await res.json();
        setUsers(
          users.map((u) =>
            u.id === resetUser.id ? { ...u, coins: data.newBalance } : u
          )
        );
        addToast(data.message, "success");
      } else {
        const data = await res.json();
        addToast(data.error || "Reset хийхэд алдаа гарлаа", "error");
      }
    } catch {
      addToast("Reset хийхэд алдаа гарлаа", "error");
    } finally {
      setActionLoading(null);
      setResetUser(null);
    }
  };

  const handleTopUp = async () => {
    if (!selectedUser || !coinAmount) return;

    const amount = parseInt(coinAmount, 10);
    if (isNaN(amount) || amount <= 0) {
      addToast("Зөвхөн эерэг тоо оруулна уу", "error");
      return;
    }

    setModalOpen(false);
    setActionLoading(selectedUser.id);

    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}/topup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });

      if (res.ok) {
        const data = await res.json();
        setUsers(
          users.map((u) =>
            u.id === selectedUser.id ? { ...u, coins: data.coins } : u
          )
        );
        addToast(
          `"${selectedUser.username}" хэрэглэгчид ${amount} coin нэмэгдлээ`,
          "success"
        );
        await update();
      } else {
        addToast("Coin нэмэхэд алдаа гарлаа", "error");
      }
    } catch {
      addToast("Coin нэмэхэд алдаа гарлаа", "error");
    } finally {
      setActionLoading(null);
      setSelectedUser(null);
      setCoinAmount("");
    }
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
        <h1 className={styles.title}>Coin нэмэх</h1>
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
                  <th>Эрх</th>
                  <th>Coin</th>
                  <th>Нэгдсэн</th>
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
                    <td data-label="Эрх">
                      <span className={`${styles.role} ${styles[user.role]}`}>
                        {user.role}
                      </span>
                    </td>
                    <td data-label="Coin">
                      <span className={styles.coinValue}>{user.coins}</span>
                    </td>
                    <td data-label="Нэгдсэн">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className={styles.actions}>
                      <button
                        onClick={() => openHistoryModal(user)}
                        disabled={actionLoading === user.id}
                        className={styles.historyButton}
                      >
                        Түүх
                      </button>
                      <button
                        onClick={() => openTopUpModal(user)}
                        disabled={actionLoading === user.id}
                        className={styles.topUpButton}
                      >
                        Top Up
                      </button>
                      <button
                        onClick={() => openResetModal(user)}
                        disabled={actionLoading === user.id}
                        className={styles.resetButton}
                      >
                        Reset
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
              {selectedUser.username} - Coin нэмэх
            </h2>
            <p className={styles.modalSubtitle}>
              Одоо: <strong>{selectedUser.coins}</strong> coin
            </p>

            <div className={styles.quickAmounts}>
              {[1000, 5000, 10000].map((amount) => (
                <button
                  key={amount}
                  onClick={() => handleQuickAmount(amount)}
                  className={`${styles.quickAmountButton} ${
                    coinAmount === amount.toString() ? styles.active : ""
                  }`}
                >
                  +{amount.toLocaleString()}
                </button>
              ))}
            </div>

            <input
              type="number"
              value={coinAmount}
              onChange={(e) => setCoinAmount(e.target.value)}
              placeholder="Coin тоо оруулах..."
              className={styles.coinInput}
              min="1"
            />

            <div className={styles.modalActions}>
              <button
                onClick={() => setModalOpen(false)}
                className={styles.cancelButton}
              >
                Цуцлах
              </button>
              <button
                onClick={handleTopUp}
                disabled={!coinAmount || parseInt(coinAmount, 10) <= 0}
                className={styles.confirmButton}
              >
                Нэмэх
              </button>
            </div>
          </div>
        </div>
      )}

      {resetModalOpen && resetUser && (
        <div className={styles.modalOverlay} onClick={() => setResetModalOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.resetModalHeader}>
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            </div>
            <h2 className={styles.modalTitle} style={{ textAlign: "center" }}>
              Баталгаажуулалт
            </h2>
            <p className={styles.modalSubtitle} style={{ textAlign: "center" }}>
              <strong>{resetUser.username}</strong> хэрэглэгчийн тайлсан бүх бүлгийг reset хийх уу?
            </p>
            <p className={styles.resetWarning}>
              Зарцуулсан зоос буцаан олгогдох бөгөөд coin түүхэд reset бичилт нэмэгдэнэ. Энэ үйлдлийг буцаах боломжгүй.
            </p>
            <div className={styles.modalActions} style={{ justifyContent: "center" }}>
              <button
                onClick={() => setResetModalOpen(false)}
                className={styles.cancelButton}
              >
                Цуцлах
              </button>
              <button
                onClick={confirmReset}
                className={styles.resetConfirmButton}
              >
                Устгах
              </button>
            </div>
          </div>
        </div>
      )}

      {historyModalOpen && historyUser && (
        <div className={styles.modalOverlay} onClick={() => setHistoryModalOpen(false)}>
          <div className={`${styles.modal} ${styles.historyModal}`} onClick={(e) => e.stopPropagation()}>
            <div className={styles.historyModalHeader}>
              <div>
                <h2 className={styles.modalTitle}>{historyUser.username}</h2>
                <p className={styles.modalSubtitle}>
                  Coin түүх · Нийт: <strong>{historyUser.coins}</strong> coin
                </p>
              </div>
              <button
                onClick={() => setHistoryModalOpen(false)}
                className={styles.closeButton}
                aria-label="Хаах"
              >
                ✕
              </button>
            </div>

            {historyLoading ? (
              <p className={styles.historyLoading}>Ачаалж байна...</p>
            ) : history.length === 0 ? (
              <p className={styles.historyEmpty}>Coin гүйлгээ байхгүй.</p>
            ) : (
              <>
                <div className={styles.historyTableWrap}>
                  <table className={styles.historyTable}>
                    <thead>
                      <tr>
                        <th>Төрөл</th>
                        <th>Хэмжээ</th>
                        <th>Баланс</th>
                        <th>Зохиол</th>
                        <th>Бүлэг</th>
                        <th>Тайлбар</th>
                        <th>Огноо</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((item) => (
                        <tr key={item.id}>
                          <td>
                            <span
                              className={`${styles.historyType} ${
                                item.type === "unlock"
                                  ? styles.typeUnlock
                                  : item.type === "refund"
                                  ? styles.typeRefund
                                  : item.type === "topup"
                                  ? styles.typeTopup
                                  : item.type === "reset"
                                  ? styles.typeReset
                                  : styles.typeOther
                              }`}
                            >
                              {item.type === "unlock"
                                ? "Түгжээ тайлах"
                                : item.type === "refund"
                                ? "Буцаалт"
                                : item.type === "topup"
                                ? "Цэнэглэлт"
                                : item.type === "reset"
                                ? "Reset"
                                : item.type}
                            </span>
                          </td>
                          <td
                            className={
                              item.amount < 0
                                ? styles.amountNegative
                                : styles.amountPositive
                            }
                          >
                            {item.amount > 0 ? `+${item.amount}` : item.amount}
                          </td>
                          <td>{item.balance}</td>
                          <td>{item.novel?.title || "—"}</td>
                          <td>
                            {item.chapter
                              ? `Бүлэг ${item.chapter.chapterNumber}`
                              : item.volumeChapter
                              ? `Бүлэг ${item.volumeChapter.chapterNumber}`
                              : "—"}
                          </td>
                          <td>{item.description || "—"}</td>
                          <td>
                            {new Date(item.createdAt).toLocaleString("mn-MN", {
                              year: "numeric",
                              month: "2-digit",
                              day: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {historyTotalPages > 1 && (
                  <div className={styles.historyPagination}>
                    <button
                      onClick={() => fetchHistoryPage(historyPage - 1)}
                      disabled={historyPage === 1 || historyLoading}
                      className={styles.pageButton}
                    >
                      ←
                    </button>
                    <span className={styles.pageInfo}>
                      {historyPage} / {historyTotalPages}
                    </span>
                    <button
                      onClick={() => fetchHistoryPage(historyPage + 1)}
                      disabled={historyPage === historyTotalPages || historyLoading}
                      className={styles.pageButton}
                    >
                      →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
      <Toast toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
