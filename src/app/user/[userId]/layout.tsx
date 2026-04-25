"use client";

import { useState, useEffect } from "react";
import { useParams, usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import Spinner from "@/components/ui/Spinner";
import { UserProfileProvider, useUserProfile } from "./UserProfileContext";
import styles from "./page.module.css";

function getRoleBadge(role: string) {
  switch (role) {
    case "admin":
      return { label: "Admin", className: styles.adminBadge };
    case "moderator":
      return { label: "Mod", className: styles.modBadge };
    default:
      return { label: "Reader", className: styles.readerBadge };
  }
}

interface UserProfile {
  id: string;
  username: string;
  email: string;
  avatar: string | null;
  bio: string | null;
  role: string;
  emailVerified: boolean;
  needsPassword: boolean;
  subscriptionPlan: string | null;
  subscriptionExpiresAt: string | null;
  acceptedTermsAt: string | null;
  createdAt: string;
}

function getActiveTab(pathname: string, userId: string) {
  if (pathname === `/user/${userId}/reviews`) return "reviews";
  if (pathname === `/user/${userId}/comments`) return "comments";
  if (pathname === `/user/${userId}/library`) return "library";
  if (pathname === `/user/${userId}/history`) return "history";
  if (pathname === `/user/${userId}/novels` || pathname.startsWith(`/user/${userId}/novels/`)) return "novels";
  return "profile";
}

function UserLayoutInner({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const userId = params.userId as string;
  const user = useUserProfile();
  const { data: session } = useSession();
  const isOwner = session?.user?.id === userId;
  const activeTab = getActiveTab(pathname, userId);

  if (!user) {
    return <Spinner />;
  }

  const roleBadge = getRoleBadge(user.role);
  const isSubscribed = user.subscriptionPlan && user.subscriptionExpiresAt && new Date(user.subscriptionExpiresAt) > new Date();

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.avatarWrapper}>
            {user.avatar ? (
              <Image
                src={user.avatar}
                alt={user.username}
                width={80}
                height={80}
                className={styles.avatar}
              />
            ) : (
              <div className={styles.avatarPlaceholder}>
                {user.username.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className={styles.userInfo}>
            <h1 className={styles.username}>
              {user.username}
              {isSubscribed && (
                <span className={styles.diamondBadge} title={`${user.subscriptionPlan === "simple" ? "Simple" : "Medium"} төлөвлөгөө`}>
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l2.4 7.2h7.6l-6 4.8 2.4 7.2-6-4.8-6 4.8 2.4-7.2-6-4.8h7.6z"/>
                  </svg>
                </span>
              )}
            </h1>
            <div className={styles.userMeta}>
              <span className={roleBadge.className}>{roleBadge.label}</span>
            </div>
          </div>
        </div>
      </div>

      <nav className={styles.tabsNav}>
        <div className={styles.tabs}>
          <Link href={`/user/${userId}`} className={`${styles.tab} ${activeTab === "profile" ? styles.activeTab : ""}`}>
            <span className={styles.tabLabelDesktop}>Хэрэглэгчийн мэдээлэл</span>
            <span className={styles.tabLabelMobile}>Мэдээлэл</span>
          </Link>
          {isOwner && (
            <>
              <Link href={`/user/${userId}/library`} className={`${styles.tab} ${activeTab === "library" ? styles.activeTab : ""}`}>
                <span className={styles.tabLabelDesktop}>Хадгалсан зохиолууд</span>
                <span className={styles.tabLabelMobile}>Номын сан</span>
              </Link>
              <Link href={`/user/${userId}/history`} className={`${styles.tab} ${activeTab === "history" ? styles.activeTab : ""}`}>
                <span className={styles.tabLabelDesktop}>Зоосны түүх</span>
                <span className={styles.tabLabelMobile}>Түүх</span>
              </Link>
              <Link href={`/user/${userId}/novels`} className={`${styles.tab} ${activeTab === "novels" ? styles.activeTab : ""}`}>
                <span className={styles.tabLabelDesktop}>Миний зохиолууд</span>
                <span className={styles.tabLabelMobile}>Зохиол</span>
              </Link>
            </>
          )}
          <Link href={`/user/${userId}/comments`} className={`${styles.tab} ${activeTab === "comments" ? styles.activeTab : ""}`}>
            <span className={styles.tabLabelDesktop}>Сэтгэгдлүүд</span>
            <span className={styles.tabLabelMobile}>Сэтгэгдэл</span>
          </Link>
          <Link href={`/user/${userId}/reviews`} className={`${styles.tab} ${activeTab === "reviews" ? styles.activeTab : ""}`}>
            <span className={styles.tabLabelDesktop}>Үнэлгээнүүд</span>
            <span className={styles.tabLabelMobile}>Үнэлгээ</span>
          </Link>
        </div>
      </nav>

      {children}
    </div>
  );
}

export default function UserLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const userId = params.userId as string;
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true);
      const res = await fetch(`/api/users/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      }
      setLoading(false);
    };
    fetchUser();
  }, [userId]);

  if (loading) {
    return <Spinner />;
  }

  if (!user) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>User not found</div>
      </div>
    );
  }

  return (
    <UserProfileProvider user={user}>
      <UserLayoutInner>{children}</UserLayoutInner>
    </UserProfileProvider>
  );
}