"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import styles from "./page.module.css";

interface OrderData {
  coins: number;
  amount: number;
}

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchOrder();
  }, [token]);

  // Handle redirect after success using useEffect to prevent multiple timers
  useEffect(() => {
    if (!success || !order) return;
    const timer = setTimeout(() => {
      router.push("/recharge?success=true&coins=" + order.coins);
    }, 2000);
    return () => clearTimeout(timer);
  }, [success, order, router]);

  const fetchOrder = async () => {
    try {
      const res = await fetch(`/api/payment/order?token=${token}`);
      const data = await res.json();
      if (data.success) {
        setOrder(data.order);
      } else {
        setError(data.error || "Order not found");
      }
    } catch {
      setError("Failed to load order");
    }
  };

  const handlePay = async () => {
    setLoading(true);
    try {
      // Simulate payment processing delay
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Simulate occasional failure (3% chance)
      if (Math.random() < 0.03) {
        setError("Payment declined. Please try again.");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/payment/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccess(true);
      } else {
        setError(data.error || "Payment failed");
      }
    } catch {
      setError("Payment processing failed");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push("/recharge?cancelled=true");
  };

  if (error) {
    return (
      <div className={styles.checkoutPage}>
        <div className={styles.checkoutCard}>
          <div className={styles.errorState}>
            <h2>Алдаа гарлаа</h2>
            <p>{error}</p>
            <button className={styles.backLink} onClick={() => router.push("/recharge")}>
              Буцах
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className={styles.checkoutPage}>
        <div className={styles.checkoutCard}>
          <div className={styles.successState}>
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <h2>Төлбөр амжилттай!</h2>
            <p>Таны дансанд {order?.coins.toLocaleString()} зоос нэмэгдлээ.</p>
            <p>Дараа буцах болно...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className={styles.checkoutPage}>
        <div className={styles.checkoutCard}>
          <div className={styles.body} style={{ textAlign: "center", padding: "3rem" }}>
            <div className={styles.loadingSpinner} style={{ borderColor: "#003087", borderTopColor: "transparent" }} />
            <p style={{ marginTop: "1rem", color: "#6c757d" }}>Ачаалж байна...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.checkoutPage}>
      <div className={styles.checkoutCard}>
        <div className={styles.header}>
          <h1>MockPay Checkout</h1>
          <p>Хөгжүүлэлтийн төлбөрийн хуудас</p>
        </div>

        <div className={styles.body}>
          <div className={styles.mockNotice}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span>Энэ бол хөгжүүлэлтийн зориулалттай хуурамч төлбөрийн хуудас. Жинхэнэ мөнгө авахгүй.</span>
          </div>

          <div className={styles.orderSummary}>
            <h3>Захиалгын мэдээлэл</h3>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Бүтээгдэхүүн</span>
              <span className={styles.summaryValue}>{order.coins.toLocaleString()} зоос</span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Нийт дүн</span>
              <span className={`${styles.summaryValue} ${styles.totalValue}`}>${order.amount}</span>
            </div>
          </div>

          <div className={styles.paymentMethods}>
            <h3>Төлбөрийн хэрэгсэл</h3>
            <div className={styles.paymentMethod}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                <line x1="1" y1="10" x2="23" y2="10"/>
              </svg>
              <span>PayPal (Mock)</span>
            </div>
          </div>

          <div className={styles.actions}>
            <button
              className={styles.payButton}
              onClick={handlePay}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className={styles.loadingSpinner} />
                  Боловсруулж байна...
                </>
              ) : (
                `Төлөх $${order.amount}`
              )}
            </button>
            <button
              className={styles.cancelButton}
              onClick={handleCancel}
              disabled={loading}
            >
              Цуцлах
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
