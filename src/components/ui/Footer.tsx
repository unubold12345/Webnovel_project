import Link from "next/link";
import styles from "./Footer.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.brand}>
          <span className={styles.brandName}>Dream Novel</span>
          <p className={styles.text}>Бүх эрх хуулиар хамгаалагдсан</p>
        </div>
        <div className={styles.links}>
          <Link href="/novels" className={styles.link}>Бүх зохиол</Link>
          <Link href="/recharge" className={styles.link}>Зоос цэнэглэх</Link>
          <Link href="/subscription" className={styles.link}>Сарын эрх</Link>
        </div>
      </div>
    </footer>
  );
}