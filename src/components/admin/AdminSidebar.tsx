import Link from "next/link";
import styles from "./AdminSidebar.module.css";

export default function AdminSidebar() {
  return (
    <aside className={styles.sidebar}>
      <nav className={styles.nav}>
        <Link href="/admin" className={styles.link}>
          Хяналтын самбар
        </Link>
        <Link href="/admin/novels" className={styles.link}>
          Novels
        </Link>
        <Link href="/admin/users" className={styles.link}>
          Хэрэглэгчид
        </Link>
        <Link href="/admin/reports" className={styles.link}>
          Мэдээллүүд
        </Link>
        <Link href="/admin/dev-tools" className={styles.link}>
          Хөгжүүлэгчийн хэрэгсэл
        </Link>
      </nav>
    </aside>
  );
}