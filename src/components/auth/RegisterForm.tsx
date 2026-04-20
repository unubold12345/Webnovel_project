"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./AuthForms.module.css";

export default function RegisterForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (password !== confirmPassword) {
      setError("Нууц үг таарахгүй байна");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password }),
    });

    const data = await res.json();

    if (res.ok) {
      // Auto-login after successful registration
      const signInResult = await signIn("credentials", {
        username,
        password,
        redirect: false,
      });

      if (signInResult?.error) {
        setError("Бүртгэл амжилттай боловч нэвтрэхэд алдаа гарлаа. Нэвтрэх хуудас руу очиж гараар нэвтэрнэ үү.");
        setLoading(false);
      } else {
        router.push("/");
        router.refresh();
      }
    } else {
      setError(data.error || "Бүртгүүлж чадсангүй");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <h1 className={styles.title}>Бүртгүүлэх</h1>
      {error && <p className={styles.error}>{error}</p>}
      <div className={styles.field}>
        <label className={styles.label}>Хэрэглэгчийн нэр</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className={styles.input}
          required
        />
      </div>
      <div className={styles.field}>
        <label className={styles.label}>Имэйл</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={styles.input}
          required
        />
      </div>
      <div className={styles.field}>
        <label className={styles.label}>Нууц үг</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={styles.input}
          required
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
        />
      </div>
      <button type="submit" className={styles.button} disabled={loading}>
        {loading ? "Бүртгүүлж байна..." : "Бүртгүүлэх"}
      </button>
      <p className={styles.switch}>
        Бүртгэл байгаа юу? <Link href="/auth/login">Нэвтрэх</Link>
      </p>
    </form>
  );
}