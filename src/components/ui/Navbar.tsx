"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { useState, useEffect } from "react";
import Image from "next/image";
import NotificationDropdown from "./NotificationDropdown";
import styles from "./Navbar.module.css";

export default function Navbar() {
  const { data: session, update } = useSession();
  const [showDropdown, setShowDropdown] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [mounted, setMounted] = useState(false);
  const username = session?.user?.name || session?.user?.email || "Хэрэглэгч";

  useEffect(() => {
    setMounted(true);
    // Load theme from localStorage or detect system preference
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute("data-theme", savedTheme);
    } else if (window.matchMedia("(prefers-color-scheme: light)").matches) {
      setTheme("light");
      document.documentElement.setAttribute("data-theme", "light");
    }
  }, []);

  useEffect(() => {
    if (session?.user?.id) {
      fetch("/api/profile/avatar")
        .then((res) => res.json())
        .then((data) => setAvatar(data.avatar))
        .catch(() => {});
    }
  }, [session]);

  useEffect(() => {
    if (session?.user?.isRestricted === true) {
      signOut({ callbackUrl: "/auth/login?restricted=true" });
    }
  }, [session?.user?.isRestricted]);



  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(`.${styles.userMenu}`)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  };

  const getPanelLink = () => {
    const role = session?.user?.role?.toLowerCase();
    if (role === "admin") return "/admin";
    if (role === "moderator") return "/moderator";
    return null;
  };

  const panelLink = getPanelLink();

  return (
    <nav className={styles.navbar}>
      <div className={styles.container}>
        <Link href="/" className={styles.logo}>
          Webnovel
        </Link>
        <div className={styles.navLinks}>
          {mounted && (
            <button
              onClick={toggleTheme}
              className={styles.themeToggle}
              aria-label={theme === "dark" ? "Гэгээлэг горим руу шилжих" : "Харанхуй горим руу шилжих"}
            >
              {theme === "dark" ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5"/>
                  <line x1="12" y1="1" x2="12" y2="3"/>
                  <line x1="12" y1="21" x2="12" y2="23"/>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                  <line x1="1" y1="12" x2="3" y2="12"/>
                  <line x1="21" y1="12" x2="23" y2="12"/>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
              )}
            </button>
          )}
          {session ? (
            <div className={styles.sessionLinks}>
              <NotificationDropdown />
              <div className={styles.userMenu}>
                <button
                  className={styles.userButton}
                  onClick={() => setShowDropdown(!showDropdown)}
                >
                  {avatar ? (
                    <Image
                      src={avatar}
                      alt={username}
                      width={32}
                      height={32}
                      className={styles.avatar}
                    />
                  ) : (
                    <div className={styles.avatarPlaceholder}>
                      {username.charAt(0).toUpperCase()}
                    </div>
                  )}
                </button>
                {showDropdown && (
                  <div className={styles.dropdown}>
                    <Link href={`/user/${session.user.id}`} className={styles.dropdownItem}>
                      Профайл
                    </Link>
                    {panelLink && (
                      <Link href={panelLink} className={styles.dropdownItem}>
                        {session.user.role?.charAt(0).toUpperCase() + session.user.role?.slice(1)}
                      </Link>
                    )}
                    <button
                      onClick={() => signOut()}
                      className={styles.dropdownItem}
                    >
                      Гарах
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              <Link href="/auth/login" className={styles.navLink}>
                Нэвтрэх
              </Link>
              <Link href="/auth/register" className={styles.navLink}>
                Бүртгүүлэх
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}