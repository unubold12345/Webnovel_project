"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import styles from "./page.module.css";
import { Toast, useToast } from "@/components/ui/Toast";

interface ProfileFormProps {
  user: {
    id: string;
    username: string;
    email: string;
    avatar: string | null;
    bio: string | null;
    needsPassword: boolean;
  };
}

export default function ProfileForm({ user }: ProfileFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toasts, addToast, removeToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(user.avatar || "");
  const [showPasswordSection, setShowPasswordSection] = useState(user.needsPassword);
  const [passwordError, setPasswordError] = useState("");
  const [formData, setFormData] = useState({
    username: user.username,
    bio: user.bio || "",
    avatar: user.avatar || "",
  });
  const [passwordData, setPasswordData] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [isSettingPassword, setIsSettingPassword] = useState(user.needsPassword);

  useEffect(() => {
    if (user.needsPassword) {
      setShowPasswordSection(true);
      setIsSettingPassword(true);
    }
  }, [user.needsPassword]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
    setPasswordError("");
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const uploadData = new FormData();
    uploadData.append("file", file);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: uploadData,
    });

    if (res.ok) {
      const data = await res.json();
      setFormData({ ...formData, avatar: data.url });
      setAvatarPreview(data.url);
    }
    setUploading(false);
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const res = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    if (res.ok) {
      router.refresh();
      router.push(`/user/${user.id}`);
    }
    setLoading(false);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");

    // Validation
    if (!isSettingPassword && !passwordData.oldPassword) {
      setPasswordError("Хуучин нууц үгээ оруулна уу");
      return;
    }
    if (!passwordData.newPassword) {
      setPasswordError("Шинэ нууц үгээ оруулна уу");
      return;
    }
    if (passwordData.newPassword.length < 6) {
      setPasswordError("Нууц үг хамгийн багадаа 6 тэмдэгт байх ёстой");
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError("Шинэ нууц үг таарахгүй байна");
      return;
    }

    setLoading(true);

    const endpoint = isSettingPassword ? "/api/auth/set-password" : "/api/profile/password";
    const body = isSettingPassword
      ? { password: passwordData.newPassword }
      : {
          oldPassword: passwordData.oldPassword,
          newPassword: passwordData.newPassword,
        };

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (res.ok) {
      addToast("Нууц үг амжилттай өөрчлөгдлөө!", "success", 5000);
      setPasswordData({
        oldPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setShowPasswordSection(false);
      setIsSettingPassword(false);
      router.refresh();
    } else {
      setPasswordError(data.error || "Нууц үг өөрчлөхөд алдаа гарлаа");
    }

    setLoading(false);
  };

  return (
    <div className={styles.formContainer}>
      <form onSubmit={handleProfileSubmit} className={styles.form}>
        <div className={styles.field}>
          <label className={styles.label}>Профайл зураг</label>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className={styles.fileInput}
          />
          {uploading && <p className={styles.uploading}>Оруулж байна...</p>}
          {avatarPreview && (
            <div className={styles.preview}>
              <Image
                src={avatarPreview}
                alt="Профайл зургийн урьдчилан харах"
                width={100}
                height={100}
                className={styles.avatar}
              />
            </div>
          )}
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Хэрэглэгчийн нэр</label>
          <input
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            className={styles.input}
            required
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Танилцуулга</label>
          <textarea
            name="bio"
            value={formData.bio}
            onChange={handleChange}
            className={styles.textarea}
            placeholder="Өөрийгөө танилцуулна уу..."
          />
        </div>
        <div className={styles.actions}>
          <button type="submit" className={styles.button} disabled={loading}>
            {loading ? "Хадгалж байна..." : "Профайл хадгалах"}
          </button>
        </div>
      </form>

      {/* Password Change Section */}
      <div className={styles.form} style={{ marginTop: "1.5rem" }}>
        <div className={styles.passwordSection}>
          <h3 className={styles.passwordSectionTitle}>
            {isSettingPassword ? "Нууц үг тохируулах" : "Нууц үг өөрчлөх"}
          </h3>
          
          {!showPasswordSection ? (
            <button
              type="button"
              className={styles.passwordToggle}
              onClick={() => setShowPasswordSection(true)}
            >
              {isSettingPassword ? "Нууц үг тохируулах" : "Нууц үг өөрчлөх"}
            </button>
          ) : (
            <form onSubmit={handlePasswordSubmit}>
              <div className={styles.passwordFields}>
                {isSettingPassword && (
                  <p className={styles.infoMessage}>
                    Google-ээр нэвтэрсэн тул гараар нэвтрэхийн тулд нууц үг тохируулна уу.
                  </p>
                )}
                {!isSettingPassword && (
                  <div className={styles.field}>
                    <label className={styles.label}>Хуучин нууц үг</label>
                    <input
                      type="password"
                      name="oldPassword"
                      value={passwordData.oldPassword}
                      onChange={handlePasswordChange}
                      className={styles.input}
                      placeholder="Хуучин нууц үгээ оруулна уу"
                    />
                  </div>
                )}
                <div className={styles.field}>
                  <label className={styles.label}>Шинэ нууц үг</label>
                  <input
                    type="password"
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    className={styles.input}
                    placeholder="Шинэ нууц үгээ оруулна уу"
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Шинэ нууц үг баталгаажуулах</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    className={styles.input}
                    placeholder="Шинэ нууц үгээ дахин оруулна уу"
                  />
                </div>
                {passwordError && (
                  <p className={styles.errorMessage}>{passwordError}</p>
                )}
                <div className={styles.actions}>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => {
                      setShowPasswordSection(false);
                      setPasswordData({
                        oldPassword: "",
                        newPassword: "",
                        confirmPassword: "",
                      });
                      setPasswordError("");
                    }}
                  >
                    Цуцлах
                  </button>
                  <button
                    type="submit"
                    className={styles.button}
                    disabled={loading}
                  >
                    {loading ? "Хадгалж байна..." : (isSettingPassword ? "Нууц үг тохируулах" : "Нууц үг өөрчлөх")}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
      <Toast toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
