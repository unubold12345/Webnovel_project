"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { Toast, useToast } from "@/components/ui/Toast";
import ConfirmModal from "@/components/ui/ConfirmModal";
import NotificationModal from "@/components/ui/NotificationModal";
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
  createdAt: string;
  subscriptionPlan: string | null;
  subscriptionExpiresAt: string | null;
  _count: {
    comments: number;
  };
}

export default function AdminUsersPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [restrictModalOpen, setRestrictModalOpen] = useState(false);
  const [restrictTarget, setRestrictTarget] = useState<User | null>(null);
  const [restrictAction, setRestrictAction] = useState<boolean>(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  const [notifModalOpen, setNotifModalOpen] = useState(false);
  const [notifTarget, setNotifTarget] = useState<User | null>(null);
  const [notifLoading, setNotifLoading] = useState(false);

  const [openMenuUserId, setOpenMenuUserId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const menuBtnRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const { addToast } = useToast();

  const currentUserRole = session?.user?.role;
  const isAdmin = currentUserRole === "admin";
  const canManageRoles = isAdmin;
  const canRestrict = isAdmin || currentUserRole === "moderator";

  useEffect(() => {
    fetchUsers();
  }, [search, page]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("." + styles.actionMenuWrap) && !target.closest("." + styles.actionMenu)) {
        setOpenMenuUserId(null);
        setMenuPos(null);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const openMenuFor = useCallback((userId: string) => {
    const btn = menuBtnRefs.current.get(userId);
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    setMenuPos({ top: rect.bottom + 4, left: rect.right - 180 });
    setOpenMenuUserId(userId);
  }, []);

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

  const handleRoleChange = async (userId: string, newRole: string) => {
    setActionLoading(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });

      if (res.ok) {
        setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
        addToast("Хэрэглэгчийн эрх амжилттай шинэчлэгдлээ", "success");
      } else {
        addToast("Эрх өөрчлөхөд алдаа гарлаа", "error");
      }
    } catch {
      addToast("Эрх өөрчлөхөд алдаа гарлаа", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRestrictionClick = (user: User, isRestricted: boolean) => {
    setRestrictTarget(user);
    setRestrictAction(isRestricted);
    setRestrictModalOpen(true);
  };

  const handleConfirmRestriction = async () => {
    if (!restrictTarget) return;

    setRestrictModalOpen(false);
    setActionLoading(restrictTarget.id);
    
    try {
      const res = await fetch(`/api/admin/users/${restrictTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRestricted: restrictAction }),
      });

      if (res.ok) {
        setUsers(users.map(u => u.id === restrictTarget.id ? { ...u, isRestricted: restrictAction } : u));
        if (restrictAction) {
          addToast("Хэрэглэгч хязгаарлагдлаа", "success");
        } else {
          addToast("Хязгаарлалт арилгагдлаа", "success");
        }
      } else {
        addToast(restrictAction ? "Хязгаарлахад алдаа гарлаа" : "Хязгаарлалт арилгахад алдаа гарлаа", "error");
      }
    } catch {
      addToast(restrictAction ? "Хязгаарлахад алдаа гарлаа" : "Хязгаарлалт арилгахад алдаа гарлаа", "error");
    } finally {
      setActionLoading(null);
      setRestrictTarget(null);
    }
  };

  const formatLastActive = (date: string) => {
    const lastActive = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - lastActive.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Дөнгөж сая";
    if (diffMins < 60) return `${diffMins} минутын өмнө`;
    if (diffHours < 24) return `${diffHours} цагийн өмнө`;
    if (diffDays < 7) return `${diffDays} хоногийн өмнө`;
    return lastActive.toLocaleDateString();
  };

  const getRestrictMessage = () => {
    if (!restrictTarget) return "";
    if (restrictAction) {
      return `"${restrictTarget.username}" хэрэглэгчийг хязгаарлахдаа итгэлтэй байна уу? Хязгаарлагдсан хэрэглэгч сэтгэгдэл үлдээх боломжгүй болно.`;
    }
    return `"${restrictTarget.username}" хэрэглэгчийн хязгаарлалтыг арилгахдаа итгэлтэй байна уу?`;
  };

  const handleDeleteClick = (user: User) => {
    setDeleteTarget(user);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    setDeleteModalOpen(false);
    setActionLoading(deleteTarget.id);

    try {
      const res = await fetch(`/api/admin/users/${deleteTarget.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setUsers(users.filter(u => u.id !== deleteTarget.id));
        addToast("Хэрэглэгч амжилттай устгагдлаа", "success");
      } else {
        const data = await res.json();
        addToast(data.error || "Хэрэглэгч устгахад алдаа гарлаа", "error");
      }
    } catch {
      addToast("Хэрэглэгч устгахад алдаа гарлаа", "error");
    } finally {
      setActionLoading(null);
      setDeleteTarget(null);
    }
  };

  const getDeleteMessage = () => {
    if (!deleteTarget) return "";
    return `"${deleteTarget.username}" хэрэглэгчийг устгахдаа итгэлтэй байна уу? Энэ үйлдэл буцаагдахгүй. Тухайн хэрэглэгчийн бүх сэтгэгдэл, тойм, өгөгдөл бүрмөсөн устах болно.`;
  };

  const handleOpenNotifModal = (user?: User) => {
    setNotifTarget(user || null);
    setNotifModalOpen(true);
  };

  const handleSendNotification = async (message: string, link: string) => {
    setNotifLoading(true);
    try {
      const res = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: notifTarget?.id || null,
          message,
          link: link || null,
          type: "admin",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (notifTarget) {
          addToast(`"${notifTarget.username}" хэрэглэгч рүү мэдэгдэл илгээгдлээ`, "success");
        } else {
          addToast(`Бүх хэрэглэгч рүү мэдэгдэл илгээгдлээ (${data.count} хэрэглэгч)`, "success");
        }
        setNotifModalOpen(false);
        setNotifTarget(null);
      } else {
        const data = await res.json();
        addToast(data.error || "Мэдэгдэл илгээхэд алдаа гарлаа", "error");
      }
    } catch {
      addToast("Мэдэгдэл илгээхэд алдаа гарлаа", "error");
    } finally {
      setNotifLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Хэрэглэгчид</h1>
        {isAdmin && (
          <button
            onClick={() => handleOpenNotifModal()}
            className={styles.notifyAllButton}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            Бүгдэд мэдэгдэл илгээх
          </button>
        )}
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
                  <th>Төлөв</th>
                  <th>Сүүлд идэвхитэй</th>
                  <th>Сэтгэгдэл</th>
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
                        {user.isRestricted && (
                          <span className={styles.restrictedBadge}>Хязгаарлагдсан</span>
                        )}
                      </div>
                    </td>
                    <td data-label="Имэйл">{user.email}</td>
                    <td data-label="Эрх">
                      {canManageRoles && user.role !== "admin" ? (
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value)}
                          disabled={actionLoading === user.id}
                          className={`${styles.roleSelect} ${styles[user.role]}`}
                        >
                          <option value="user">Хэрэглэгч</option>
                          <option value="moderator">Зохицуулагч</option>
                        </select>
                      ) : (
                        <span className={`${styles.role} ${styles[user.role]}`}>
                          {user.role}
                        </span>
                      )}
                    </td>
                    <td data-label="Төлөв">
                      <div className={styles.statusCell}>
                        {user.isRestricted ? (
                          <span className={styles.statusRestricted}>Хязгаарлагдсан</span>
                        ) : (
                          <span className={styles.statusActive}>Идэвхитэй</span>
                        )}
                        {user.subscriptionPlan && user.subscriptionExpiresAt && new Date(user.subscriptionExpiresAt) > new Date() && (
                          <span className={`${styles.planBadge} ${user.subscriptionPlan === "medium" ? styles.mediumPlan : styles.simplePlan}`}>
                            {user.subscriptionPlan === "simple" ? "Simple" : "Medium"}
                          </span>
                        )}
                      </div>
                    </td>
                    <td data-label="Сүүлд идэвхитэй">{formatLastActive(user.lastActiveAt)}</td>
                    <td data-label="Сэтгэгдэл">{user._count.comments}</td>
                    <td data-label="Нэгдсэн">{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td className={styles.actions}>
                      <Link
                        href={`/admin/users/${user.id}/info`}
                        className={styles.actionButton}
                      >
                        Мэдээлэл
                      </Link>
                      <Link
                        href={`/user/${user.id}`}
                        className={styles.actionButton}
                      >
                        Профайл харах
                      </Link>
                      <div className={styles.actionMenuWrap}>
                        <button
                          ref={(el) => {
                            if (el) menuBtnRefs.current.set(user.id, el);
                            else menuBtnRefs.current.delete(user.id);
                          }}
                          className={styles.menuButton}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (openMenuUserId === user.id) {
                              setOpenMenuUserId(null);
                              setMenuPos(null);
                            } else {
                              openMenuFor(user.id);
                            }
                          }}
                          aria-label="Үйлдлүүд"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <circle cx="12" cy="5" r="2"/>
                            <circle cx="12" cy="12" r="2"/>
                            <circle cx="12" cy="19" r="2"/>
                          </svg>
                        </button>
                      </div>
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

      {(() => {
        const user = users.find((u) => u.id === openMenuUserId);
        if (!user || !menuPos) return null;
        return (
          <div
            className={styles.actionMenu}
            style={{ position: "fixed", top: menuPos.top, left: menuPos.left }}
          >
            {isAdmin && user.id !== session?.user?.id && (
              <button
                className={styles.menuItem}
                onClick={() => {
                  setOpenMenuUserId(null);
                  setMenuPos(null);
                  handleOpenNotifModal(user);
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
                Мэдэгдэл илгээх
              </button>
            )}
            {isAdmin && user.id !== session?.user?.id && user.role !== "admin" && user.role !== "moderator" && (
              <button
                className={styles.menuItem}
                onClick={() => {
                  setOpenMenuUserId(null);
                  setMenuPos(null);
                  handleRestrictionClick(user, !user.isRestricted);
                }}
                disabled={actionLoading === user.id}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                </svg>
                {user.isRestricted ? "Хязгаарлалт арилгах" : "Хязгаарлах"}
              </button>
            )}
            {isAdmin && user.id !== session?.user?.id && (
              <button
                className={`${styles.menuItem} ${styles.menuItemDanger}`}
                onClick={() => {
                  setOpenMenuUserId(null);
                  setMenuPos(null);
                  handleDeleteClick(user);
                }}
                disabled={actionLoading === user.id}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
                Устгах
              </button>
            )}
          </div>
        );
      })()}

      <ConfirmModal
        isOpen={restrictModalOpen}
        title={restrictAction ? "Хэрэглэгч хязгаарлах" : "Хязгаарлалт арилгах"}
        message={getRestrictMessage()}
        confirmText={restrictAction ? "Хязгаарлах" : "Арилгах"}
        cancelText="Цуцлах"
        confirmButtonClass={restrictAction ? "danger" : "warning"}
        onConfirm={handleConfirmRestriction}
        onCancel={() => {
          setRestrictModalOpen(false);
          setRestrictTarget(null);
        }}
      />

      <ConfirmModal
        isOpen={deleteModalOpen}
        title="Хэрэглэгч устгах"
        message={getDeleteMessage()}
        confirmText="Устгах"
        cancelText="Цуцлах"
        confirmButtonClass="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setDeleteModalOpen(false);
          setDeleteTarget(null);
        }}
      />

      <NotificationModal
        isOpen={notifModalOpen}
        recipientLabel={notifTarget ? notifTarget.username : "Бүх хэрэглэгчид"}
        onSend={handleSendNotification}
        onCancel={() => {
          setNotifModalOpen(false);
          setNotifTarget(null);
        }}
        loading={notifLoading}
      />
    </div>
  );
}
