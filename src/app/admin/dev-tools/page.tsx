"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import styles from "./page.module.css";

type LogoTheme = "dark" | "light";

export default function AdminDevToolsPage() {
  const { data: session } = useSession();
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [logoDarkUrl, setLogoDarkUrl] = useState<string | null>(null);
  const [logoLightUrl, setLogoLightUrl] = useState<string | null>(null);
  const [uploadingTheme, setUploadingTheme] = useState<LogoTheme | null>(null);
  const [logoMessage, setLogoMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const darkInputRef = useRef<HTMLInputElement>(null);
  const lightInputRef = useRef<HTMLInputElement>(null);

  const [heroMediaUrl, setHeroMediaUrl] = useState<string | null>(null);
  const [heroMediaType, setHeroMediaType] = useState<"image" | "video" | null>(null);
  const [uploadingHero, setUploadingHero] = useState(false);
  const [heroMessage, setHeroMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const heroInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/dev/logo")
      .then((res) => res.json())
      .then((data) => {
        setLogoDarkUrl(data.logoDarkUrl);
        setLogoLightUrl(data.logoLightUrl);
        setHeroMediaUrl(data.heroMediaUrl);
        setHeroMediaType(data.heroMediaType);
      })
      .catch(() => {});
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, theme: LogoTheme) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingTheme(theme);
    setLogoMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) {
        setLogoMessage({ type: "error", text: uploadData.error || "Upload failed" });
        setUploadingTheme(null);
        return;
      }

      const body = theme === "dark" ? { logoDarkUrl: uploadData.url } : { logoLightUrl: uploadData.url };
      const saveRes = await fetch("/api/dev/logo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const saveData = await saveRes.json();
      if (!saveRes.ok) {
        setLogoMessage({ type: "error", text: saveData.error || "Failed to save logo" });
        setUploadingTheme(null);
        return;
      }

      if (theme === "dark") setLogoDarkUrl(saveData.logoDarkUrl);
      else setLogoLightUrl(saveData.logoLightUrl);
      setLogoMessage({ type: "success", text: `${theme === "dark" ? "Dark" : "Light"} logo uploaded successfully!` });
    } catch {
      setLogoMessage({ type: "error", text: "Network error during upload" });
    }

    setUploadingTheme(null);
    if (theme === "dark" && darkInputRef.current) darkInputRef.current.value = "";
    if (theme === "light" && lightInputRef.current) lightInputRef.current.value = "";
  };

  const handleRemoveLogo = async (theme: LogoTheme) => {
    setUploadingTheme(theme);
    setLogoMessage(null);

    try {
      const body = theme === "dark" ? { logoDarkUrl: null } : { logoLightUrl: null };
      const res = await fetch("/api/dev/logo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        if (theme === "dark") setLogoDarkUrl(null);
        else setLogoLightUrl(null);
        setLogoMessage({ type: "success", text: `${theme === "dark" ? "Dark" : "Light"} logo removed successfully!` });
      } else {
        const data = await res.json();
        setLogoMessage({ type: "error", text: data.error || "Failed to remove logo" });
      }
    } catch {
      setLogoMessage({ type: "error", text: "Network error" });
    }

    setUploadingTheme(null);
  };

  const uploadToCloudinaryDirect = async (file: File): Promise<string> => {
    const sigRes = await fetch("/api/dev/cloudinary-signature", { method: "POST" });
    if (!sigRes.ok) {
      const err = await sigRes.json();
      throw new Error(err.error || "Failed to get upload signature");
    }
    const sig = await sigRes.json();

    const formData = new FormData();
    formData.append("file", file);
    formData.append("api_key", sig.apiKey);
    formData.append("timestamp", String(sig.timestamp));
    formData.append("signature", sig.signature);
    formData.append("folder", sig.folder);

    const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/auto/upload`, {
      method: "POST",
      body: formData,
    });

    const uploadData = await uploadRes.json();
    if (!uploadRes.ok) {
      throw new Error(uploadData.error?.message || "Cloudinary upload failed");
    }

    return uploadData.secure_url;
  };

  const handleHeroFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingHero(true);
    setHeroMessage(null);

    try {
      const url = await uploadToCloudinaryDirect(file);
      const type: "image" | "video" = file.type.startsWith("video") ? "video" : "image";

      const saveRes = await fetch("/api/dev/logo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ heroMediaUrl: url, heroMediaType: type }),
      });

      const saveData = await saveRes.json();
      if (!saveRes.ok) {
        setHeroMessage({ type: "error", text: saveData.error || "Failed to save hero media" });
        setUploadingHero(false);
        return;
      }

      setHeroMediaUrl(saveData.heroMediaUrl);
      setHeroMediaType(saveData.heroMediaType);
      setHeroMessage({ type: "success", text: "Hero media uploaded successfully!" });
    } catch (err: any) {
      setHeroMessage({ type: "error", text: err.message || "Network error during upload" });
    }

    setUploadingHero(false);
    if (heroInputRef.current) heroInputRef.current.value = "";
  };

  const handleRemoveHeroMedia = async () => {
    setUploadingHero(true);
    setHeroMessage(null);

    try {
      const res = await fetch("/api/dev/logo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ heroMediaUrl: null, heroMediaType: null }),
      });

      if (res.ok) {
        setHeroMediaUrl(null);
        setHeroMediaType(null);
        setHeroMessage({ type: "success", text: "Hero media removed successfully!" });
      } else {
        const data = await res.json();
        setHeroMessage({ type: "error", text: data.error || "Failed to remove hero media" });
      }
    } catch {
      setHeroMessage({ type: "error", text: "Network error" });
    }

    setUploadingHero(false);
  };

  const handleDeleteAllComments = async () => {
    const confirmText = "TYPE 'DELETE' TO CONFIRM";
    const userInput = prompt(`⚠️ WARNING: This will delete ALL comments and comment likes!\n\nThis action cannot be undone.\n\nTo confirm, type: ${confirmText}`);

    if (userInput !== "DELETE") {
      setMessage({ type: "error", text: "Deletion cancelled. You must type 'DELETE' to confirm." });
      return;
    }

    setDeleting(true);
    setMessage(null);

    try {
      const res = await fetch("/api/dev/comments", {
        method: "DELETE",
      });

      if (res.ok) {
        const data = await res.json();
        setMessage({ type: "success", text: data.message });
      } else {
        const error = await res.json();
        setMessage({ type: "error", text: error.error || "Failed to delete comments" });
      }
    } catch {
      setMessage({ type: "error", text: "Network error. Please try again." });
    }

    setDeleting(false);
  };

  if (session?.user?.role !== "admin") {
    return (
      <div className={styles.accessDenied}>
        <p>Хандах эрхгүй. Зөвхөн админ хандана.</p>
      </div>
    );
  }

  return (
    <div className={styles.devTools}>
      <div className={styles.header}>
        <h1 className={styles.title}>Dev Tools</h1>
        <span className={styles.badge}>Admin Only</span>
      </div>
      <div className={styles.content}>
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Site Logo</h3>
          <p className={styles.description}>
            Upload separate logos for dark and light themes. The appropriate logo will be shown based on the user's selected theme.
          </p>

          {/* Dark Logo */}
          <div className={styles.logoSubSection}>
            <h4 className={styles.logoSubTitle}>Dark Theme Logo</h4>
            {logoDarkUrl && (
              <div className={`${styles.logoPreview} ${styles.logoPreviewDark}`}>
                <Image src={logoDarkUrl} alt="Dark theme logo" width={120} height={40} className={styles.logoImage} />
              </div>
            )}
            <div className={styles.logoActions}>
              <input
                ref={darkInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => handleFileChange(e, "dark")}
                disabled={uploadingTheme !== null}
                className={styles.fileInput}
                id="logo-upload-dark"
              />
              <label htmlFor="logo-upload-dark" className={styles.uploadButton}>
                {uploadingTheme === "dark" ? "Uploading..." : "Upload Dark Logo"}
              </label>
              {logoDarkUrl && (
                <button onClick={() => handleRemoveLogo("dark")} disabled={uploadingTheme !== null} className={styles.removeButton}>
                  Remove
                </button>
              )}
            </div>
          </div>

          {/* Light Logo */}
          <div className={styles.logoSubSection}>
            <h4 className={styles.logoSubTitle}>Light Theme Logo</h4>
            {logoLightUrl && (
              <div className={`${styles.logoPreview} ${styles.logoPreviewLight}`}>
                <Image src={logoLightUrl} alt="Light theme logo" width={120} height={40} className={styles.logoImage} />
              </div>
            )}
            <div className={styles.logoActions}>
              <input
                ref={lightInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => handleFileChange(e, "light")}
                disabled={uploadingTheme !== null}
                className={styles.fileInput}
                id="logo-upload-light"
              />
              <label htmlFor="logo-upload-light" className={styles.uploadButton}>
                {uploadingTheme === "light" ? "Uploading..." : "Upload Light Logo"}
              </label>
              {logoLightUrl && (
                <button onClick={() => handleRemoveLogo("light")} disabled={uploadingTheme !== null} className={styles.removeButton}>
                  Remove
                </button>
              )}
            </div>
          </div>

          {logoMessage && (
            <p className={`${styles.message} ${styles[logoMessage.type]}`}>
              {logoMessage.text}
            </p>
          )}
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Homepage Hero Media</h3>
          <p className={styles.description}>
            Upload a GIF or MP4 to display at the top of the homepage. Supports animated GIFs and video files.
          </p>
          {heroMediaUrl && heroMediaType && (
            <div className={styles.heroPreview}>
              {heroMediaType === "video" ? (
                <video src={heroMediaUrl} muted loop playsInline className={styles.heroPreviewMedia} />
              ) : (
                <Image src={heroMediaUrl} alt="Hero media" width={300} height={120} className={styles.heroPreviewMedia} />
              )}
            </div>
          )}
          <div className={styles.logoActions}>
            <input
              ref={heroInputRef}
              type="file"
              accept="image/gif,video/mp4,video/webm"
              onChange={handleHeroFileChange}
              disabled={uploadingHero}
              className={styles.fileInput}
              id="hero-upload"
            />
            <label htmlFor="hero-upload" className={styles.uploadButton}>
              {uploadingHero ? "Uploading..." : "Upload Hero Media"}
            </label>
            {heroMediaUrl && (
              <button onClick={handleRemoveHeroMedia} disabled={uploadingHero} className={styles.removeButton}>
                Remove
              </button>
            )}
          </div>
          {heroMessage && (
            <p className={`${styles.message} ${styles[heroMessage.type]}`}>
              {heroMessage.text}
            </p>
          )}
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Comments Management</h3>
          <p className={styles.description}>
            Delete all comments and comment likes. Novels, chapters, and user accounts will NOT be affected.
          </p>
          <button
            onClick={handleDeleteAllComments}
            disabled={deleting}
            className={styles.dangerButton}
          >
            {deleting ? "Deleting..." : "Delete All Comments"}
          </button>
          {message && (
            <p className={`${styles.message} ${styles[message.type]}`}>
              {message.text}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
