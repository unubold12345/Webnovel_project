"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import styles from "./page.module.css";

const PLANS = [
  {
    id: "simple",
    name: "Simple",
    coins: 20000,
    price: 20,
    description: "Сар бүр 20,000 зоос авна",
    features: ["20,000 зоос / сар", "Бүх үнэгүй бүлгүүд", "Сэтгэгдэл бичих"],
  },
  {
    id: "medium",
    name: "Medium",
    coins: 30000,
    price: 30,
    description: "Сар бүр 30,000 зоос авна",
    features: ["30,000 зоос / сар", "Бүх үнэгүй бүлгүүд", "Сэтгэгдэл бичих", "Түргэн дэмжлэг"],
    popular: true,
  },
];

export default function SubscriptionPage() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const isSubscribed = user?.subscriptionPlan && user?.subscriptionExpiresAt && new Date(user.subscriptionExpiresAt) > new Date();
  const planName = user?.subscriptionPlan === "simple" ? "Simple" : user?.subscriptionPlan === "medium" ? "Medium" : null;

  return (
    <div className={styles.subscriptionPage}>
      <div className={styles.header}>
        <h1>Сарын захиалга</h1>
        <p>Тогтмол зоос авч, дуртай зохиолоо уншаарай</p>
      </div>

      {isSubscribed && (
        <div className={styles.activePlan}>
          <div className={styles.activePlanIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          </div>
          <div>
            <h2>Танд {planName} төлөвлөгөө идэвхитэй байна</h2>
            <p>Дуусах хугацаа: {new Date(user.subscriptionExpiresAt).toLocaleDateString()}</p>
          </div>
        </div>
      )}

      <div className={styles.plansGrid}>
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            className={`${styles.planCard} ${plan.popular ? styles.popular : ""} ${user?.subscriptionPlan === plan.id ? styles.current : ""}`}
          >
            {plan.popular && <span className={styles.popularBadge}>Алдартай</span>}
            {user?.subscriptionPlan === plan.id && <span className={styles.currentBadge}>Одоогийн</span>}
            <h3 className={styles.planName}>{plan.name}</h3>
            <p className={styles.planDescription}>{plan.description}</p>
            <div className={styles.planPrice}>
              <span className={styles.price}>${plan.price}</span>
              <span className={styles.period}>/ сар</span>
            </div>
            <div className={styles.coinBadge}>+{plan.coins.toLocaleString()} зоос</div>
            <ul className={styles.features}>
              {plan.features.map((feature, idx) => (
                <li key={idx} className={styles.feature}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>
            <button
              className={styles.subscribeButton}
              disabled={!session?.user || user?.subscriptionPlan === plan.id}
              onClick={() => alert("Төлбөрийн систем удахгүй нэмэгдэнэ")}
            >
              {user?.subscriptionPlan === plan.id ? "Идэвхитэй" : session?.user ? "Сонгох" : "Нэвтэрч орох"}
            </button>
          </div>
        ))}
      </div>

      <div className={styles.infoSection}>
        <h3>Түгээмэл асуултууд</h3>
        <div className={styles.faqList}>
          <div className={styles.faqItem}>
            <h4>Зоосыг хэрхэн авах вэ?</h4>
            <p>Захиалга амжилттай болсны дараа таны дансанд автоматаар зоос нэмэгдэнэ.</p>
          </div>
          <div className={styles.faqItem}>
            <h4>Захиалгыг цуцлах боломжтой юу?</h4>
            <p>Тийм ээ, та хүссэн үедээ захиалгаа цуцлах боломжтой.</p>
          </div>
          <div className={styles.faqItem}>
            <h4>Хугацаа дууссаны дараа юу болох вэ?</h4>
            <p>Захиалгын хугацаа дууссаны дараа танд мэдэгдэл ирж, дахин сунгах боломжтой.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
