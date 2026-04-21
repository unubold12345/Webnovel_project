"use client";

import { signIn } from "next-auth/react";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import styles from "./AuthForms.module.css";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get("restricted") === "true") {
      setError("Таны бүртгэл хязгаарлагдсан байна. Администратортой холбогдоно уу.");
    }
    if (searchParams.get("verified") === "true") {
      setError("Имэйл амжилттай баталгаажлаа!");
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });

    if (result?.error) {
      // Check if user is restricted
      const res = await fetch("/api/auth/check-restricted", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.isRestricted) {
          setError("Таны бүртгэл хязгаарлагдсан байна. Администратортой холбогдоно уу.");
        } else {
          setError("Хэрэглэгчийн нэр эсвэл нууц үг буруу байна");
        }
      } else {
        setError("Хэрэглэгчийн нэр эсвэл нууц үг буруу байна");
      }
      setLoading(false);
    } else {
      setLoading(false);
      window.location.href = "/";
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError("");
    await signIn("google", { callbackUrl: "/" });
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <h1 className={styles.title}>Нэвтрэх</h1>
      {error && <p className={styles.error}>{error}</p>}
      
      <button
        type="button"
        onClick={handleGoogleSignIn}
        className={styles.googleButton}
        disabled={loading}
      >
        <svg className={styles.googleIcon} viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Google-ээр нэвтрэх
      </button>

      <div className={styles.divider}>
        <span>эсвэл</span>
      </div>

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
        <label className={styles.label}>Нууц үг</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={styles.input}
          required
        />
        <div style={{ textAlign: "right", marginTop: "0.25rem" }}>
          <Link href="/auth/forgot-password" style={{ fontSize: "0.8125rem", color: "var(--primary)" }}>
            Нууц үг сэргээх
          </Link>
        </div>
      </div>
      <button type="submit" className={styles.button} disabled={loading}>
        {loading ? "Нэвтэрч байна..." : "Нэвтрэх"}
      </button>
      
      <p className={styles.switch}>
        Бүртгэл байхгүй юу?{" "}
        <Link href="/auth/register">Бүртгүүлэх</Link>
      </p>
    </form>
  );
}
