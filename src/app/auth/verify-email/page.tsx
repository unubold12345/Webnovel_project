"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./page.module.css";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      setStatus("error");
      setMessage("Баталгаажуулах код олдсонгүй");
      return;
    }

    const verifyEmail = async () => {
      try {
        const res = await fetch(`/api/auth/verify-email?token=${token}`);
        const data = await res.json();

        if (res.ok) {
          setStatus("success");
          setMessage(data.message || "Имэйл амжилттай баталгаажлаа!");
          
          // Redirect to home after 3 seconds
          setTimeout(() => {
            router.push("/?verified=true");
          }, 3000);
        } else {
          setStatus("error");
          setMessage(data.error || "Баталгаажуулахад алдаа гарлаа");
        }
      } catch (error) {
        setStatus("error");
        setMessage("Баталгаажуулахад алдаа гарлаа");
      }
    };

    verifyEmail();
  }, [searchParams, router]);

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        {status === "loading" && (
          <>
            <div className={styles.spinner}></div>
            <h1 className={styles.title}>Имэйл баталгаажуулж байна...</h1>
            <p className={styles.message}>Түр хүлээнэ үү</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className={styles.successIcon}>✓</div>
            <h1 className={styles.title}>Амжилттай!</h1>
            <p className={styles.message}>{message}</p>
            <p className={styles.redirect}>Нэвтрэх хуудас руу шилжиж байна...</p>
            <Link href="/auth/login?verified=true" className={styles.link}>
              Нэвтрэх хуудас руу очих
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <div className={styles.errorIcon}>✕</div>
            <h1 className={styles.title}>Алдаа гарлаа</h1>
            <p className={styles.message}>{message}</p>
            <Link href="/auth/login" className={styles.link}>
              Нэвтрэх хуудас руу очих
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
