"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import styles from "@/components/auth/AuthForms.module.css";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [token, setToken] = useState("");

  useEffect(() => {
    const t = searchParams.get("token");
    if (t) {
      setToken(t);
    } else {
      setError("Баталгаажуулах код олдсонгүй");
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (password !== confirmPassword) {
      setError("Нууц үг таарахгүй байна");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Нууц үг хамгийн багадаа 6 тэмдэгт байх ёстой");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });

    const data = await res.json();

    if (res.ok) {
      setSuccess(true);
    } else {
      setError(data.error || "Алдаа гарлаа");
    }
    setLoading(false);
  };

  if (success) {
    return (
      <div className={styles.authWrapper}>
      <div className={styles.form}>
        <h1 className={styles.title}>Амжилттай!</h1>
        <div className={styles.successMessage}>
          <p>Таны нууц үг амжилттай шинэчлэгдлээ.</p>
          <div style={{ marginTop: "2rem" }}>
            <Link href="/auth/login" className={styles.button}>
              Нэвтрэх
            </Link>
          </div>
        </div>
    </div>
      </div>
  );
}

  return (
    <div className={styles.authWrapper}>
    <form onSubmit={handleSubmit} className={styles.form}>
      <h1 className={styles.title}>Шинэ нууц үг тохируулах</h1>
      {error && <p className={styles.error}>{error}</p>}
      <div className={styles.field}>
        <label className={styles.label}>Шинэ нууц үг</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={styles.input}
          required
          minLength={6}
        />
      </div>
      <div className={styles.field}>
        <label className={styles.label}>Нууц үг баталгаажуулах</label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className={styles.input}
          required
          minLength={6}
        />
      </div>
      <button type="submit" className={styles.button} disabled={loading || !token}>
        {loading ? "Хадгалж байна..." : "Нууц үг шинэчлэх"}
      </button>
      <p className={styles.switch}>
        <Link href="/auth/login">Нэвтрэх хуудас руу буцах</Link>
      </p>
    </form>
    </div>
  );
}
