import Link from "next/link";
import styles from "./ModeratorSidebar.module.css";

export default function ModeratorSidebar() {
  return (
    <aside className={styles.sidebar}>
      <h2 className={styles.title}>Зохицуулагч панел</h2>
      <nav className={styles.nav}>
        <Link href="/moderator" className={styles.link}>
          Хяналтын самбар
        </Link>
        <Link href="/moderator/novels" className={styles.link}>
          Вебньюэл
        </Link>
        <Link href="/moderator/users" className={styles.link}>
          Хэрэглэгчид
        </Link>
        <Link href="/moderator/reports" className={styles.link}>
          Мэдээллүүд
        </Link>
      </nav>
    </aside>
  );
}