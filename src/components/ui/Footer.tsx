import styles from "./Footer.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <p className={styles.text}>Вебньюэл Платформ - Бүх эрх хуулиар хамгаалагдсан</p>
      </div>
    </footer>
  );
}