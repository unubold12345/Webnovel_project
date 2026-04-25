"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";
import { useUserProfile } from "./UserProfileContext";
import styles from "./page.module.css";

export default function UserProfilePage() {
  const user = useUserProfile();
  const { data: session, update } = useSession();
  const userId = user?.id ?? "";
  const isOwner = session?.user?.id === userId;
  
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState("");
  const [verificationError, setVerificationError] = useState("");
  const [devVerificationUrl, setDevVerificationUrl] = useState("");
  const [termsLoading, setTermsLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(!!user?.acceptedTermsAt);

  if (!user) {
    return (
      <div className={styles.error}>User not found</div>
    );
  }

  const handleSendVerification = async () => {
    setVerificationLoading(true);
    setVerificationMessage("");
    setVerificationError("");
    setDevVerificationUrl("");

    const res = await fetch("/api/auth/resend-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        username: user.username,
        email: user.email 
      }),
    });

    const data = await res.json();

    if (res.ok) {
      setVerificationMessage("Баталгаажуулах имэйл илгээгдлээ. Имэйл хаягаа шалгана уу.");
      if (data.devMode && data.verificationUrl) {
        setDevVerificationUrl(data.verificationUrl);
      }
    } else {
      setVerificationError(data.error || "Имэйл илгээхэд алдаа гарлаа.");
    }
    setVerificationLoading(false);
  };

  const handleAcceptTerms = async () => {
    setTermsLoading(true);
    const res = await fetch("/api/user/accept-terms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });

    if (res.ok) {
      setTermsAccepted(true);
      await update();
    }
    setTermsLoading(false);
  };

  return (
    <>
      <div className={styles.profileSection}>
        <h2 className={styles.sectionTitle}>Хэрэглэгчийн мэдээлэл</h2>
        <div className={styles.profileTable}>
          <div className={styles.profileRow}>
            <span className={styles.profileLabel}>Хэрэглэгчийн нэр</span>
            <span className={styles.profileValue}>
              {user.username}
            </span>
          </div>
          {isOwner && (
            <div className={styles.profileRow}>
              <span className={styles.profileLabel}>И-мэйл</span>
              <span className={styles.profileValue}>
                {user.email}
                {user.emailVerified ? (
                  <span className={styles.verifiedText}> ✓ Баталгаажсан</span>
                ) : (
                  <span className={styles.unverifiedText}> ⚠ Баталгаажаагүй</span>
                )}
              </span>
            </div>
          )}
          <div className={styles.profileRow}>
            <span className={styles.profileLabel}>Миний тухай</span>
            <span className={styles.profileValue}>{user.bio || "-"}</span>
          </div>
          <div className={styles.profileRow}>
            <span className={styles.profileLabel}>Бүртгүүлсэн огноо</span>
            <span className={styles.profileValue}>
              {new Date(user.createdAt).toLocaleDateString("en-US", {
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </span>
          </div>
        </div>

        {/* Email Verification Section - Only for owner */}
        {isOwner && !user.emailVerified && (
          <div className={styles.verificationSection}>
            <div className={styles.verificationBox}>
              <div className={styles.verificationHeader}>
                <svg className={styles.verificationIcon} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
                </svg>
                <div>
                  <h3 className={styles.verificationTitle}>Имэйл хаягаа баталгаажуулна уу</h3>
                  <p className={styles.verificationText}>
                    Таны имэйл хаяг баталгаажаагүй байна. Имэйл хаягаа баталгаажуулснаар бүртгэлийн аюулгүй байдлаа нэмэгдүүлээрэй.
                  </p>
                </div>
              </div>
              
              {verificationMessage && (
                <div className={styles.successMessage}>
                  {verificationMessage}
                </div>
              )}
              
              {verificationError && (
                <div className={styles.errorMessage}>
                  {verificationError}
                </div>
              )}
              
              {devVerificationUrl && (
                <div className={styles.devBox}>
                  <p style={{ fontWeight: 600, marginBottom: "0.5rem" }}>🛠️ Хөгжүүлэлтийн горим:</p>
                  <p style={{ fontSize: "0.875rem", marginBottom: "0.5rem" }}>
                    SMTP тохиргоо хийгээгүй тул доорх холбоосыг ашиглана уу:
                  </p>
                  <a 
                    href={devVerificationUrl}
                    className={styles.devLink}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Баталгаажуулах холбоос
                  </a>
                </div>
              )}
              
              <button 
                onClick={handleSendVerification}
                className={styles.verificationButton}
                disabled={verificationLoading}
              >
                {verificationLoading ? "Илгээж байна..." : "Баталгаажуулах имэйл илгээх"}
              </button>
            </div>
          </div>
        )}

        {isOwner && (
          <div className={styles.actionButtons}>
            <button onClick={() => signOut({ callbackUrl: "/" })} className={styles.signOutButton}>
              Гарах
            </button>
            <Link href={`/user/${userId}/edit`} className={styles.updateButton}>
              Мэдээлэл шинэчлэх
            </Link>
          </div>
        )}

        {/* Password Setup Prompt for Google Users */}
        {isOwner && user.needsPassword && (
          <div className={styles.passwordPromptSection}>
            <div className={styles.passwordPromptBox}>
              <div className={styles.passwordPromptHeader}>
                <svg className={styles.passwordPromptIcon} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                </svg>
                <div>
                  <h3 className={styles.passwordPromptTitle}>Нууц үг тохируулах</h3>
                  <p className={styles.passwordPromptText}>
                    Та Google-ээр нэвтэрсэн тул гараар нэвтрэхийн тулд нууц үг тохируулах шаардлагатай.
                  </p>
                </div>
              </div>
              <div className={styles.passwordPromptButtons}>
                <Link href={`/user/${userId}/edit`} className={styles.setPasswordButton}>
                  Нууц үг тохируулах
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Terms & Conditions for Publishing */}
        {isOwner && !termsAccepted && (
          <div className={styles.termsSection}>
            <div className={styles.termsBox}>
              <div className={styles.termsHeader}>
                <svg className={styles.termsIcon} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                </svg>
                <div>
                  <h3 className={styles.termsTitle}>Нийтлэх эрх авах</h3>
                  <p className={styles.termsText}>
                    Өөрийн зохиол нийтлэхийн тулд та үйлчилгээний нөхцөлийг зөвшөөрөх шаардлагатай.
                  </p>
                </div>
              </div>
              <div className={styles.termsContent}>
                <h4>Үйлчилгээний нөхцөл</h4>
                <ul>
                  <li>Та зөвхөн өөрийн бүтээсэн, эсвэл нийтлэх эрхтэй контентыг оруулах ёстой.</li>
                  <li>Бусдын эрхийг зөрчсөн, хууль бус агуулгыг оруулахыг хориглоно.</li>
                  <li>Платформын дүрмийг зөрчсөн тохиолдолд таны бүртгэл хязгаарлагдах болно.</li>
                  <li>Таны нийтлэсэн контент платформ дээр харагдах бөгөөд админ удирдлага хяналт тавина.</li>
                </ul>
              </div>
              <button 
                onClick={handleAcceptTerms}
                className={styles.termsButton}
                disabled={termsLoading}
              >
                {termsLoading ? "Хадгалж байна..." : "Зөвшөөрч, нийтлэх эрх авах"}
              </button>
            </div>
          </div>
        )}

        {isOwner && termsAccepted && (
          <div className={styles.termsSection}>
            <div className={styles.termsBoxAccepted}>
              <div className={styles.termsHeader}>
                <svg className={styles.termsIcon} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
                <div>
                  <h3 className={styles.termsTitle}>Нийтлэх эрхтэй</h3>
                  <p className={styles.termsText}>
                    Та үйлчилгээний нөхцөлийг зөвшөөрсөн бөгөөд өөрийн зохиол нийтлэх боломжтой.
                  </p>
                </div>
              </div>
              <Link href={`/user/${userId}/novels`} className={styles.termsButton}>
                Миний зохиолууд руу очих
              </Link>
            </div>
          </div>
        )}
      </div>

      {user.stats && (
        <div className={styles.statsSection}>
          <div className={styles.statsGrid}>
            <div className={styles.statGroup}>
              <h3 className={styles.statGroupTitle}>Сэтгэгдэл</h3>
              <div className={styles.statCards}>
                <div className={styles.statCard}>
                  <span className={styles.statCardLabel}>Сэтгэгдлүүд</span>
                  <span className={styles.statCardValue}>{user.stats.comments.count}</span>
                </div>
                <div className={styles.statCard}>
                  <span className={styles.statCardLabel}>Таалагдсан</span>
                  <span className={styles.statCardValue}>{user.stats.comments.likes}</span>
                  <span className={styles.statCardSubValue}>{user.stats.comments.likes > 0 ? "+" : ""}0.0</span>
                </div>
                <div className={styles.statCard}>
                  <span className={styles.statCardLabel}>Таалагдаагүй</span>
                  <span className={styles.statCardValue}>{user.stats.comments.dislikes}</span>
                  <span className={styles.statCardSubValue}>{user.stats.comments.dislikes > 0 ? "-" : ""}0.0</span>
                </div>
              </div>
            </div>

            <div className={styles.statGroup}>
              <h3 className={styles.statGroupTitle}>Шүүмж</h3>
              <div className={styles.statCards}>
                <div className={styles.statCard}>
                  <span className={styles.statCardLabel}>Шүүмжнүүд</span>
                  <span className={styles.statCardValue}>{user.stats.reviews.count}</span>
                </div>
                <div className={styles.statCard}>
                  <span className={styles.statCardLabel}>Таалагдсан</span>
                  <span className={styles.statCardValue}>{user.stats.reviews.likes}</span>
                  <span className={styles.statCardSubValue}>{user.stats.reviews.likes > 0 ? "+" : ""}0.0</span>
                </div>
                <div className={styles.statCard}>
                  <span className={styles.statCardLabel}>Таалагдаагүй</span>
                  <span className={styles.statCardValue}>{user.stats.reviews.dislikes}</span>
                  <span className={styles.statCardSubValue}>{user.stats.reviews.dislikes > 0 ? "-" : ""}0.0</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
