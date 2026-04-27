"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "@/components/auth/AuthForms.module.css";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [devResetUrl, setDevResetUrl] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);
    setDevResetUrl("");

    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();

    if (res.ok) {
      setSuccess(true);
      if (data.devMode && data.resetUrl) {
        setDevResetUrl(data.resetUrl);
      }
    } else {
      setError(data.error || "Алдаа гарлаа");
    }
    setLoading(false);
  };

  if (success) {
    return (
      <div className={styles.authWrapper}>
      <div className={styles.form}>
        <h1 className={styles.title}>Имэйл илгээгдлээ</h1>
        <div className={styles.successMessage}>
          <p>Хэрэв ийм имэйл бүртгэлтэй бол нууц үг сэргээх холбоос илгээгдсэн байна.</p>
          <p style={{ marginTop: "0.5rem", color: "var(--text-secondary)" }}>
            Имэйл хаягаа шалгаж, зааврыг дагана уу.
          </p>

          {devResetUrl && (
            <div className={styles.devBox}>
              <p style={{ fontWeight: 600, marginBottom: "0.5rem" }}>🛠️ Хөгжүүлэлтийн горим:</p>
              <p style={{ fontSize: "0.875rem", marginBottom: "0.5rem" }}>
                SMTP тохиргоо хийгээгүй тул доорх холбоосыг ашиглана уу:
              </p>
              <a
                href={devResetUrl}
                className={styles.devLink}
                target="_blank"
                rel="noopener noreferrer"
              >
                Нууц үг сэргээх холбоос
              </a>
            </div>
          )}

          <div style={{ marginTop: "2rem" }}>
            <Link href="/auth/login" className={styles.button}>
              Нэвтрэх хуудас руу очих
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
      <h1 className={styles.title}>Нууц үг сэргээх</h1>
      {error && <p className={styles.error}>{error}</p>}
      <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginBottom: "1rem", textAlign: "center" }}>
        Бүртгэлтэй имэйл хаягаа оруулна уу. Нууц үг сэргээх холбоос илгээх болно.
      </p>
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
      <button type="submit" className={styles.button} disabled={loading}>
        {loading ? "Илгээж байна..." : "Холбоос илгээх"}
      </button>
      <p className={styles.switch}>
        Нууц үгээ сэргээсэн үү? <Link href="/auth/login">Нэвтрэх</Link>
      </p>
    </form>
    </div>
  );
}
