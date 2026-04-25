"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import styles from "./layout.module.css";

const allTabs = [
  { href: "/admin", labelDesktop: "Хяналтын самбар", labelMobile: "Самбар", roles: ["admin", "moderator"] },
  { href: "/admin/novels", labelDesktop: "Зохиолууд", labelMobile: "Зохиол", roles: ["admin", "moderator"] },
  { href: "/admin/users", labelDesktop: "Хэрэглэгчид", labelMobile: "Хэрэглэгч", roles: ["admin", "moderator"] },
  { href: "/admin/topup", labelDesktop: "Зоос нэмэх", labelMobile: "Зоос", roles: ["admin"] },
  { href: "/admin/subscriptions", labelDesktop: "Сарын захиалга", labelMobile: "Эрх", roles: ["admin"] },
  { href: "/admin/paid-chapters", labelDesktop: "Төлбөртэй бүлэг", labelMobile: "Төлбөр", roles: ["admin"] },
  { href: "/admin/reports", labelDesktop: "Мэдээллүүд", labelMobile: "Мэдээлэл", roles: ["admin", "moderator"] },
  { href: "/admin/dev-tools", labelDesktop: "Хөгжүүлэгчийн хэрэгсэл", labelMobile: "Dev", roles: ["admin"] },
];

export default function AdminTabs() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const userRole = session?.user?.role;

  const tabs = allTabs.filter((tab) => userRole && tab.roles.includes(userRole));

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  };

  return (
    <nav className={styles.tabsNav}>
      <div className={styles.tabs}>
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`${styles.tab} ${isActive(tab.href) ? styles.activeTab : ""}`}
          >
            <span className={styles.tabLabelDesktop}>{tab.labelDesktop}</span>
            <span className={styles.tabLabelMobile}>{tab.labelMobile}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
