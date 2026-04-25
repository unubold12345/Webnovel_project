"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./page.module.css";

const PACKAGES = [
  { id: "p1", coins: 1000, price: 1, label: "1,000 зоос" },
  { id: "p2", coins: 5000, price: 5, label: "5,000 зоос", popular: true },
  { id: "p3", coins: 10000, price: 10, label: "10,000 зоос" },
  { id: "p4", coins: 25000, price: 25, label: "25,000 зоос", popular: true },
  { id: "p5", coins: 50000, price: 50, label: "50,000 зоос" },
  { id: "p6", coins: 100000, price: 100, label: "100,000 зоос" },
];

export default function RechargePage() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [successCoins, setSuccessCoins] = useState(0);
  const processedRef = useRef(false);

  const selectedPackage = PACKAGES.find((p) => p.id === selected);
  const userCoins = (session?.user as any)?.coins ?? 0;

  useEffect(() => {
    if (processedRef.current) return;
    const successParam = searchParams.get("success");
    const coinsParam = searchParams.get("coins");
    if (successParam === "true" && coinsParam) {
      processedRef.current = true;
      setSuccess(true);
      setSuccessCoins(parseInt(coinsParam, 10));
      update();
      // Clear query params without causing re-render loop
      window.history.replaceState(null, "", "/recharge");
    }
  }, []);

  const handlePay = async () => {
    if (!selectedPackage) return;
    setLoading(true);
    try {
      const res = await fetch("/api/payment/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coins: selectedPackage.coins,
          amount: selectedPackage.price,
        }),
      });
      const data = await res.json();
      if (data.success && data.checkoutUrl) {
        router.push(data.checkoutUrl);
      } else {
        alert(data.error || "Төлбөр хийхэд алдаа гарлаа");
      }
    } catch {
      alert("Төлбөр хийхэд алдаа гарлаа");
    } finally {
      setLoading(false);
    }
  };

  if (!session?.user) {
    return (
      <div className={styles.rechargePage}>
        <div className={styles.header}>
          <h1>Зоос цэнэглэх</h1>
          <p>Зоос цэнэглэхийн тулд эхлээд нэвтэрнэ үү.</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className={styles.rechargePage}>
        <div className={styles.successMessage}>
          <h2>Амжилттай!</h2>
          <p>
            Таны дансанд {successCoins.toLocaleString()} зоос нэмэгдлээ.
          </p>
          <button
            className={styles.backButton}
            onClick={() => {
              setSuccess(false);
              setSelected(null);
              setSuccessCoins(0);
            }}
          >
            Дахин цэнэглэх
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.rechargePage}>
      <div className={styles.header}>
        <h1>Зоос цэнэглэх</h1>
        <p>Хүссэн багцаа сонгон төлбөрөө хийнэ үү</p>
      </div>

      <div className={styles.balanceCard}>
        <div className={styles.balanceLabel}>Таны одоогийн баланс</div>
        <div className={styles.balanceAmount}>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="none">
            <circle cx="12" cy="12" r="10"/>
            <text x="12" y="16" textAnchor="middle" fill="var(--background)" fontSize="10" fontWeight="bold">$</text>
          </svg>
          {userCoins.toLocaleString()}
        </div>
      </div>

      <div className={styles.packagesGrid}>
        {PACKAGES.map((pkg) => (
          <div
            key={pkg.id}
            className={`${styles.packageCard} ${selected === pkg.id ? styles.selected : ""} ${pkg.popular ? styles.popular : ""}`}
            onClick={() => setSelected(pkg.id)}
          >
            {pkg.popular && <span className={styles.popularBadge}>Алдартай</span>}
            <div className={styles.coinAmount}>{pkg.label}</div>
            <div className={styles.coinLabel}>зоос</div>
            <div className={styles.price}>${pkg.price}</div>
          </div>
        ))}
      </div>

      {selectedPackage && (
        <div className={styles.paymentSection}>
          <div className={styles.mockBadge}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            Хөгжүүлэлтийн горим - жинхэнэ төлбөр авахгүй
          </div>
          <h2>Төлбөрийн мэдээлэл</h2>
          <div className={styles.summary}>
            <span className={styles.summaryLabel}>
              {selectedPackage.label}
            </span>
            <span className={styles.summaryValue}>${selectedPackage.price}</span>
          </div>
          <button
            className={styles.payButton}
            onClick={handlePay}
            disabled={loading}
          >
            {loading ? (
              <span className={styles.loadingSpinner} />
            ) : (
              `Төлөх $${selectedPackage.price}`
            )}
          </button>
        </div>
      )}
    </div>
  );
}
