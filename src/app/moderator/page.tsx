import { db } from "@/lib/db";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default async function ModeratorDashboard() {
  const [novelCount, chapterCount, userCount, commentCount] = await Promise.all([
    db.webnovel.count(),
    db.chapter.count(),
    db.user.count(),
    db.comment.count(),
  ]);

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Хяналтын самбар</h1>
      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statValue}>{novelCount}</span>
          <span className={styles.statLabel}>Вебньюэл</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{chapterCount}</span>
          <span className={styles.statLabel}>Бүлэг</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{userCount}</span>
          <span className={styles.statLabel}>Хэрэглэгч</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{commentCount}</span>
          <span className={styles.statLabel}>Сэтгэгдэл</span>
        </div>
      </div>
    </div>
  );
}