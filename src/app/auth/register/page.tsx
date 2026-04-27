import RegisterForm from "@/components/auth/RegisterForm";
import styles from "@/components/auth/AuthForms.module.css";

export default function RegisterPage() {
  return (
    <div className={styles.authWrapper}>
      <RegisterForm />
    </div>
  );
}
