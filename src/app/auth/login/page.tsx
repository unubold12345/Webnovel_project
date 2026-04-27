import LoginForm from "@/components/auth/LoginForm";
import { Suspense } from "react";
import styles from "@/components/auth/AuthForms.module.css";

export default function LoginPage() {
  return (
    <div className={styles.authWrapper}>
      <Suspense fallback={<div>Loading...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
