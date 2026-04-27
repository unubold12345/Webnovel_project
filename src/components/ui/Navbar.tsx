"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import NotificationDropdown from "./NotificationDropdown";
import { listenCoinChange, dispatchCoinChange } from "@/lib/coinEvents";
import styles from "./Navbar.module.css";

export default function Navbar() {
  const { data: session, update } = useSession();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showCoinDropdown, setShowCoinDropdown] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [renderMobileMenu, setRenderMobileMenu] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [mounted, setMounted] = useState(false);
  const [coinFloat, setCoinFloat] = useState<{ amount: number; id: number } | null>(null);
  const [logoDarkUrl, setLogoDarkUrl] = useState<string | null>(null);
  const [logoLightUrl, setLogoLightUrl] = useState<string | null>(null);
  const lastKnownCoins = useRef<number | null>(null);
  const renderMobileMenuRef = useRef(false);
  const username = session?.user?.name || session?.user?.email || "Хэрэглэгч";

  useEffect(() => {
    const unsubscribe = listenCoinChange(({ amount }) => {
      setCoinFloat({ amount, id: Date.now() });
      const timeout = setTimeout(() => setCoinFloat(null), 1300);
      return () => clearTimeout(timeout);
    });
    return unsubscribe;
  }, []);

  // Poll for coin balance changes (e.g. admin top-up) every 5 seconds
  useEffect(() => {
    if (!session?.user?.id) return;
    lastKnownCoins.current = (session.user as any).coins ?? 0;

    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/profile");
        if (!res.ok) return;
        const data = await res.json();
        const serverCoins = data.coins ?? 0;
        const known = lastKnownCoins.current ?? serverCoins;
        if (serverCoins !== known) {
          const delta = serverCoins - known;
          dispatchCoinChange(delta);
          lastKnownCoins.current = serverCoins;
          await update();
        }
      } catch {
        // silently ignore polling errors
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [session?.user?.id, update]);

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
    fetch("/api/dev/logo")
      .then((res) => res.json())
      .then((data) => {
        setLogoDarkUrl(data.logoDarkUrl);
        setLogoLightUrl(data.logoLightUrl);
      })
      .catch(() => {});
  }, []);

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
      if (!target.closest(`.${styles.coinMenu}`)) {
        setShowCoinDropdown(false);
      }
      if (!target.closest(`.${styles.mobileMenuWrapper}`) && !target.closest(`.${styles.mobileDrawer}`)) {
        closeMobileMenu();
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const openMobileMenu = () => {
    setRenderMobileMenu(true);
    renderMobileMenuRef.current = true;
    requestAnimationFrame(() => setShowMobileMenu(true));
  };

  const closeMobileMenu = () => {
    setShowMobileMenu(false);
    renderMobileMenuRef.current = false;
    setTimeout(() => setRenderMobileMenu(false), 300);
  };

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  };

  const getPanelLink = () => {
    const role = session?.user?.role?.toLowerCase();
    if (role === "admin" || role === "moderator") return "/admin";
    return null;
  };

  const panelLink = getPanelLink();

  return (
    <nav className={styles.navbar}>
      <div className={styles.container}>
        <Link href="/" className={styles.logo}>
          {(() => {
            const url = theme === "dark" ? logoDarkUrl : logoLightUrl;
            if (url) {
              return (
                <>
                  <Image src={url} alt="Site logo" width={120} height={36} className={styles.logoImage} priority unoptimized />
                  <span className={styles.logoText}>Dream Novel</span>
                </>
              );
            }
            return <span className={styles.logoText}>Dream Novel</span>;
          })()}
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
              <div className={styles.coinMenu}>
                <button
                  className={styles.coinBadge}
                  onClick={() => setShowCoinDropdown(!showCoinDropdown)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                    <circle cx="12" cy="12" r="10"/>
                    <text x="12" y="16" textAnchor="middle" fill="var(--background)" fontSize="10" fontWeight="bold">$</text>
                  </svg>
                  <span>{(session.user as any).coins ?? 0}</span>
                  {coinFloat && (
                    <span
                      key={coinFloat.id}
                      className={`${styles.coinFloat} ${coinFloat.amount > 0 ? styles.coinFloatPositive : styles.coinFloatNegative}`}
                    >
                      {coinFloat.amount > 0 ? `+${coinFloat.amount}` : coinFloat.amount}
                    </span>
                  )}
                </button>
                {showCoinDropdown && (
                  <div className={`${styles.dropdown} ${styles.coinDropdown}`}>
                    <Link
                      href="/recharge"
                      className={styles.dropdownItem}
                      onClick={() => setShowCoinDropdown(false)}
                    >
                      <span className={styles.rechargeIcon}>+</span>
                      Цэнэглэх
                    </Link>
                  </div>
                )}
              </div>
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
            <Link href="/auth/login" className={styles.navLink}>
              Нэвтрэх
            </Link>
          )}
          {session && (
            <div className={styles.mobileMenuWrapper}>
              <button
                className={styles.mobileMenuButton}
                onClick={() => showMobileMenu ? closeMobileMenu() : openMobileMenu()}
                aria-label="Цэс"
                aria-expanded={showMobileMenu}
              >
              {showMobileMenu ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="6" x2="21" y2="6"/>
                  <line x1="3" y1="12" x2="21" y2="12"/>
                  <line x1="3" y1="18" x2="21" y2="18"/>
                </svg>
              )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile side drawer */}
      {renderMobileMenu && (
      <>
      <div
        className={`${styles.mobileDrawerBackdrop} ${showMobileMenu ? styles.mobileDrawerBackdropVisible : ""}`}
        onClick={closeMobileMenu}
        aria-hidden="true"
      />
      <div className={`${styles.mobileDrawer} ${showMobileMenu ? styles.mobileDrawerOpen : ""}`}>
        <div className={styles.mobileDrawerHeader}>
          <span className={styles.mobileDrawerTitle}>Dream Novel</span>
          {panelLink && (
            <Link
              href={panelLink}
              className={styles.mobileDrawerAdminBadge}
              onClick={closeMobileMenu}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
              Админ
            </Link>
          )}
          <button
            className={styles.mobileDrawerClose}
            onClick={closeMobileMenu}
            aria-label="Хаах"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div className={styles.mobileDrawerBody}>
          <Link
            href="/novels"
            className={styles.mobileDrawerItem}
            onClick={closeMobileMenu}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
            Зохиол
          </Link>
          {session && (
            <>
              <Link
                href={`/user/${session.user.id}`}
                className={styles.mobileDrawerItem}
                onClick={closeMobileMenu}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                Профайл
              </Link>
              <Link
                href={`/user/${session.user.id}/library`}
                className={styles.mobileDrawerItem}
                onClick={closeMobileMenu}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                Номын сан
              </Link>
            </>
          )}
          <Link
            href="/recharge"
            className={styles.mobileDrawerItem}
            onClick={closeMobileMenu}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            Зоос цэнэглэх
          </Link>
          <Link
            href="/subscription"
            className={styles.mobileDrawerItem}
            onClick={closeMobileMenu}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            Сарын эрх
          </Link>
        </div>
      </div>
      </>
      )}
    </nav>
  );
}