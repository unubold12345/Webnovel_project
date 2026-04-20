"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/ui/ToastContext";
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

export default function ModeratorUsersPage() {
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
          addToast("User restricted successfully", "success");
        } else {
          addToast("User unrestricted successfully", "success");
        }
      } else {
        addToast(restrictAction ? "Failed to restrict user" : "Failed to unrestrict user", "error");
      }
    } catch {
      addToast(restrictAction ? "Failed to restrict user" : "Failed to unrestrict user", "error");
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

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return lastActive.toLocaleDateString();
  };

  const getRestrictMessage = () => {
    if (!restrictTarget) return "";
    if (restrictAction) {
      return `Are you sure you want to restrict user "${restrictTarget.username}"? Restricted users cannot leave comments.`;
    }
    return `Are you sure you want to unrestrict user "${restrictTarget.username}"?`;
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
        addToast("User deleted successfully", "success");
      } else {
        const data = await res.json();
        addToast(data.error || "Failed to delete user", "error");
      }
    } catch {
      addToast("Failed to delete user", "error");
    } finally {
      setActionLoading(null);
      setDeleteTarget(null);
    }
  };

  const getDeleteMessage = () => {
    if (!deleteTarget) return "";
    return `Are you sure you want to delete user "${deleteTarget.username}"? This action cannot be undone. All their comments, reviews, and data will be permanently removed.`;
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Users</h1>
      </div>

      <form onSubmit={handleSearch} className={styles.searchForm}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by username or email..."
          className={styles.searchInput}
        />
        <button type="submit" className={styles.searchButton}>
          Search
        </button>
      </form>

      <div className={styles.list}>
        {loading ? (
          <p className={styles.loading}>Loading...</p>
        ) : users.length === 0 ? (
          <p className={styles.empty}>No users found</p>
        ) : (
          <>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Last Active</th>
                  <th>Comments</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>
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
                          <span className={styles.restrictedBadge}>Restricted</span>
                        )}
                      </div>
                    </td>
                    <td>{user.email}</td>
                    <td>
                      <span className={`${styles.role} ${styles[user.role]}`}>
                        {user.role}
                      </span>
                    </td>
                    <td>
                      {user.isRestricted ? (
                        <span className={styles.statusRestricted}>Restricted</span>
                      ) : (
                        <span className={styles.statusActive}>Active</span>
                      )}
                    </td>
                    <td>{formatLastActive(user.lastActiveAt)}</td>
                    <td>{user._count.comments}</td>
                    <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td className={styles.actions}>
                      {session?.user?.role === "moderator" && user.id !== session?.user?.id && user.role !== "admin" && user.role !== "moderator" && (
                        <button
                          onClick={() => handleRestrictionClick(user, !user.isRestricted)}
                          disabled={actionLoading === user.id}
                          className={`${styles.actionButton} ${user.isRestricted ? styles.unrestrict : styles.restrict}`}
                        >
                          {user.isRestricted ? "Unrestrict" : "Restrict"}
                        </button>
                      )}
                      {session?.user?.role === "admin" && user.id !== session?.user?.id && (
                        <button
                          onClick={() => handleDeleteClick(user)}
                          disabled={actionLoading === user.id}
                          className={styles.deleteButton}
                        >
                          Delete
                        </button>
                      )}
                      <Link
                        href={`/user/${user.id}`}
                        className={styles.actionButton}
                      >
                        View Profile
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
                  Previous
                </button>
                <span className={styles.pageInfo}>
                  Page {page} of {totalPages} ({totalCount} total)
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className={styles.pageButton}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <ConfirmModal
        isOpen={restrictModalOpen}
        title={restrictAction ? "Restrict User" : "Unrestrict User"}
        message={getRestrictMessage()}
        confirmText={restrictAction ? "Restrict" : "Unrestrict"}
        cancelText="Cancel"
        confirmButtonClass={restrictAction ? "danger" : "warning"}
        onConfirm={handleConfirmRestriction}
        onCancel={() => {
          setRestrictModalOpen(false);
          setRestrictTarget(null);
        }}
      />

      <ConfirmModal
        isOpen={deleteModalOpen}
        title="Delete User"
        message={getDeleteMessage()}
        confirmText="Delete"
        cancelText="Cancel"
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
