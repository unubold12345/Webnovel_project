"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { Toast, useToast } from "@/components/ui/Toast";
import ConfirmModal from "@/components/ui/ConfirmModal";
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
  const { addToast } = useToast();

  const currentUserRole = session?.user?.role;
  const isAdmin = currentUserRole === "admin";
  const canManageRoles = isAdmin;
  const canRestrict = isAdmin || currentUserRole === "moderator";

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

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Хэрэглэгчид</h1>
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
                      {user.isRestricted ? (
                        <span className={styles.statusRestricted}>Хязгаарлагдсан</span>
                      ) : (
                        <span className={styles.statusActive}>Идэвхитэй</span>
                      )}
                    </td>
                    <td data-label="Сүүлд идэвхитэй">{formatLastActive(user.lastActiveAt)}</td>
                    <td data-label="Сэтгэгдэл">{user._count.comments}</td>
                    <td data-label="Нэгдсэн">{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td className={styles.actions}>
                      {isAdmin && user.id !== session?.user?.id && user.role !== "admin" && user.role !== "moderator" && (
                        <button
                          onClick={() => handleRestrictionClick(user, !user.isRestricted)}
                          disabled={actionLoading === user.id}
                          className={`${styles.actionButton} ${user.isRestricted ? styles.unrestrict : styles.restrict}`}
                        >
                          {user.isRestricted ? "Хязгаарлалт арилгах" : "Хязгаарлах"}
                        </button>
                      )}
                      {isAdmin && user.id !== session?.user?.id && (
                        <button
                          onClick={() => handleDeleteClick(user)}
                          disabled={actionLoading === user.id}
                          className={styles.deleteButton}
                        >
                          Устгах
                        </button>
                      )}
                      <Link
                        href={`/user/${user.id}`}
                        className={styles.actionButton}
                      >
                        Профайл харах
                      </Link>
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
    </div>
  );
}
