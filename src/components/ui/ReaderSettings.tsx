"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import styles from "./ReaderSettings.module.css";

type ColorTheme =
  | "default"
  | "classic-soft-dark"
  | "dracula"
  | "nord"
  | "solarized-dark"
  | "midnight-blue"
  | "royal-road";

interface ReaderSettings {
  fontSize: number;
  paragraphHeight: number;
  lineHeight: number;
  containerWidth: number;
  fontFamily: "default" | "dyslexic" | "roboto" | "lora";
  textAlign: "left" | "center" | "right" | "justify";
  autoScroll: boolean;
  autoScrollSpeed: number;
  colorTheme: ColorTheme;
  letterSpacing: number;
  opacity: number;
  fontWeight: number;
}

const defaultSettings: ReaderSettings = {
  fontSize: 17,
  paragraphHeight: 1.5,
  lineHeight: 1.6,
  containerWidth: 900,
  fontFamily: "default",
  textAlign: "left",
  autoScroll: false,
  autoScrollSpeed: 3,
  colorTheme: "royal-road",
  letterSpacing: 0.5,
  opacity: 0.85,
  fontWeight: 500,
};

const STORAGE_KEY = "reader-settings";

// Color theme definitions
const colorThemes: Record<ColorTheme, { name: string; description: string; bg: string; text: string; accent?: string }> = {
  default: { name: "Үндсэн", description: "", bg: "", text: "" },
  "classic-soft-dark": { name: "Классик зөөлөн хар", description: "Нүдний ядралт багасгахад хамгийн тохиромжтой", bg: "#121212", text: "#E0E0E0" },
  dracula: { name: "Дракула", description: "Өнгөлөг & тод", bg: "#282A36", text: "#F8F8F2" },
  nord: { name: "Норд", description: "Тайвшруулах & тохиромжтой", bg: "#2E3440", text: "#D8DEE9" },
  "solarized-dark": { name: "Соларайзд хар", description: "Тэнцвэртэй контраст", bg: "#002B36", text: "#839496" },
  "midnight-blue": { name: "Шөнийн цэнхэр", description: "Баялаг & гоёмсог", bg: "#001F3F", text: "#E0E0E0" },
  "royal-road": { name: "Роял Роуд", description: "Урт хугацааны уншлагад зориулсан", bg: "#1a1a1a", text: "#cfcfcf" },
};

// Speed: pixels per second → converted to per-frame (~60fps)
const SPEED_MAP: Record<number, number> = {
  1: 14 / 60,   // Slow:   14px/s
  2: 40 / 60,   // Normal: 40px/s
  3: 80 / 60,   // Fast:   80px/s
};

export default function ReaderSettings() {
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState<ReaderSettings>(defaultSettings);
  const [isHydrated, setIsHydrated] = useState(false);
  const scrollRafRef = useRef<number>(0);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const autoScrollSpeedRef = useRef(settings.autoScrollSpeed);
  const scrollAccumRef = useRef(0);
  const lastManualRef = useRef<number>(0);

  autoScrollSpeedRef.current = settings.autoScrollSpeed;

  // Load settings from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSettings({ ...defaultSettings, ...parsed });
      } catch {
        // Invalid JSON, use defaults
      }
    }
    setIsHydrated(true);
  }, []);

  // Save settings to localStorage only after hydration
  useEffect(() => {
    if (!isHydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings, isHydrated]);

  // Calculate side panel width based on container
  const calculatePanelWidth = useCallback(() => {
    const container = document.querySelector('[data-reader-container="true"]');
    if (!container) return 320;
    
    const containerRect = container.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const rightSpace = viewportWidth - containerRect.right;
    
    // Minimum width of 280px, otherwise cover the right side space
    return Math.max(280, rightSpace);
  }, []);

  // Update panel width when container width changes
  useEffect(() => {
    if (!isHydrated || !isOpen) return;
    
    const updatePanelWidth = () => {
      if (panelRef.current) {
        const width = calculatePanelWidth();
        panelRef.current.style.width = `${width}px`;
      }
    };
    
    updatePanelWidth();
    window.addEventListener('resize', updatePanelWidth);
    return () => window.removeEventListener('resize', updatePanelWidth);
  }, [isOpen, settings.containerWidth, isHydrated, calculatePanelWidth]);

  // Apply settings to the page only after hydration
  useEffect(() => {
    if (!isHydrated) return;

    const content = document.querySelector('[data-reader-content="true"]');
    const container = document.querySelector('[data-reader-container="true"]');

    if (content && content instanceof HTMLElement) {
      content.style.fontSize = `${settings.fontSize}px`;
      content.style.lineHeight = `${settings.lineHeight}`;
      content.style.textAlign = settings.textAlign;
      content.style.letterSpacing = `${settings.letterSpacing}px`;
      content.style.opacity = `${settings.opacity}`;

      const pElements = content.querySelectorAll('p');
      pElements.forEach((p) => {
        if (p instanceof HTMLElement) {
          p.style.marginBottom = `${settings.paragraphHeight}em`;
          p.style.fontWeight = settings.fontWeight.toString();
        }
      });

      switch (settings.fontFamily) {
        case "dyslexic":
          content.style.fontFamily = "'OpenDyslexic', 'Comic Sans MS', sans-serif";
          break;
        case "roboto":
          content.style.fontFamily = "'Roboto', sans-serif";
          break;
        case "lora":
          content.style.fontFamily = "'Lora', serif";
          break;
        default:
          content.style.fontFamily = "";
      }

      // Apply color theme to content
      const theme = colorThemes[settings.colorTheme];
      if (settings.colorTheme === "default") {
        content.style.backgroundColor = "";
        content.style.color = "";
        content.style.textRendering = "";
      } else {
        content.style.backgroundColor = theme.bg;
        content.style.color = theme.text;
        // Royal Road specific styles - only apply text rendering, font weight is handled per paragraph
        if (settings.colorTheme === "royal-road") {
          content.style.textRendering = "optimizeLegibility";
        } else {
          content.style.textRendering = "";
        }
      }
    }

    if (container && container instanceof HTMLElement) {
      container.style.maxWidth = `${settings.containerWidth}px`;
      // Apply background to container as well for seamless look
      const theme = colorThemes[settings.colorTheme];
      if (settings.colorTheme !== "default") {
        container.style.backgroundColor = theme.bg;
      } else {
        container.style.backgroundColor = "";
      }
    }
  }, [settings, isHydrated]);

  // Track user manual scroll input — pause auto-scroll briefly while user is scrolling
  useEffect(() => {
    const markManual = () => { lastManualRef.current = Date.now(); };

    window.addEventListener("wheel", markManual, { passive: true });
    window.addEventListener("touchmove", markManual, { passive: true });
    const onKey = (e: KeyboardEvent) => {
      if (["ArrowUp","ArrowDown","PageUp","PageDown","Home","End"," "].includes(e.key)) {
        markManual();
      }
    };
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("wheel", markManual);
      window.removeEventListener("touchmove", markManual);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  // Auto scroll — pauses for 800ms after any manual scroll input
  useEffect(() => {
    if (!settings.autoScroll) return;

    scrollAccumRef.current = 0;

    const tick = () => {
      const timeSinceManual = Date.now() - lastManualRef.current;
      if (timeSinceManual > 800) {
        const speed = SPEED_MAP[autoScrollSpeedRef.current] || 1.2;
        scrollAccumRef.current += speed;
        if (scrollAccumRef.current >= 1) {
          const px = Math.floor(scrollAccumRef.current);
          window.scrollBy(0, px);
          scrollAccumRef.current -= px;
        }
      } else {
        scrollAccumRef.current = 0;
      }
      scrollRafRef.current = requestAnimationFrame(tick);
    };
    scrollRafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(scrollRafRef.current);
    };
  }, [settings.autoScroll, settings.autoScrollSpeed]);

  // Content click toggle (mobile only)
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 640px)');

    const handleClick = (e: Event) => {
      if (!mql.matches) return;
      const target = e.target as HTMLElement;
      if (target.closest('a') || target.closest('button') || target.closest('input') || target.closest('select')) return;
      setIsOpen((prev) => !prev);
    };

    const content = document.querySelector('[data-reader-content="true"]');
    if (!content) return;

    content.addEventListener('click', handleClick);
    return () => {
      content.removeEventListener('click', handleClick);
    };
  }, []);

  const updateSetting = <K extends keyof ReaderSettings>(
    key: K,
    value: ReaderSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
  };

  const fontOptions = [
    { value: "default", label: "Үндсэн Фонт" },
    { value: "roboto", label: "Roboto" },
    { value: "lora", label: "Lora" },
    { value: "dyslexic", label: "Дислексик" },
  ];

  const themeOptions: { value: ColorTheme; label: string; description: string; bg: string; text: string }[] = [
    { value: "default", label: "Үндсэн", description: "", bg: "var(--surface)", text: "var(--text)" },
    { value: "classic-soft-dark", label: "Классик зөөлөн хар", description: "Нүдний ядралт багасгахад хамгийн тохиромжтой", bg: "#121212", text: "#E0E0E0" },
    { value: "dracula", label: "Дракула", description: "Өнгөлөг & тод", bg: "#282A36", text: "#F8F8F2" },
    { value: "nord", label: "Норд", description: "Тайвшруулах & тохиромжтой", bg: "#2E3440", text: "#D8DEE9" },
    { value: "solarized-dark", label: "Соларайзд хар", description: "Тэнцвэртэй контраст", bg: "#002B36", text: "#839496" },
    { value: "midnight-blue", label: "Шөнийн цэнхэр", description: "Баялаг & гоёмсог", bg: "#001F3F", text: "#E0E0E0" },
    { value: "royal-road", label: "Роял Роуд", description: "Урт хугацааны уншлагад зориулсан", bg: "#1a1a1a", text: "#cfcfcf" },
  ];

  const alignOptions = [
    { value: "left", label: "Зүүн", icon: "Зүүн" },
    { value: "center", label: "Төв", icon: "Төв" },
    { value: "right", label: "Баруун", icon: "Баруун" },
    { value: "justify", label: "Тэгшлэх", icon: "Тэгшлэх" },
  ];

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={styles.settingsButton}
        aria-label="Уншигчийн тохиргоо"
        title="Уншигчийн тохиргоо"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div className={styles.overlay} onClick={() => setIsOpen(false)} />
          <div
            ref={panelRef}
            className={styles.sidePanel}
          >
            <div className={styles.header}>
              <h2 className={styles.title}>Уншигчийн тохиргоо</h2>
              <button
                onClick={() => setIsOpen(false)}
                className={styles.closeButton}
                aria-label="Тохиргоо хаах"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className={styles.settingsContent}>
              <div className={styles.settingGroup}>
                <label className={styles.settingLabel}>Фонт</label>
                <div className={styles.buttonGroup}>
                  {fontOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() =>
                        updateSetting("fontFamily", option.value as ReaderSettings["fontFamily"])
                      }
                      className={`${styles.optionButton} ${
                        settings.fontFamily === option.value
                          ? styles.optionButtonActive
                          : ""
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.settingGroup}>
                <div className={styles.themeGrid}>
                  {themeOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() =>
                        updateSetting("colorTheme", option.value)
                      }
                      className={`${styles.themeButton} ${
                        settings.colorTheme === option.value
                          ? styles.themeButtonActive
                          : ""
                      }`}
                      title={`${option.label} - ${option.description}`}
                    >
                      <div
                        className={styles.themePreview}
                        style={{
                          backgroundColor: option.bg,
                          color: option.text,
                        }}
                      >
                        <span className={styles.themePreviewText}>Aa</span>
                      </div>
                      <div className={styles.themeInfo}>
                        <span className={styles.themeLabel}>{option.label}</span>
                        <span className={styles.themeDescription}>{option.description}</span>
                      </div>
                      {settings.colorTheme === option.value && (
                        <svg
                          className={styles.themeCheck}
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.settingGroup}>
                <div className={styles.buttonGroup}>
                  {alignOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() =>
                        updateSetting("textAlign", option.value as ReaderSettings["textAlign"])
                      }
                      className={`${styles.optionButton} ${
                        settings.textAlign === option.value
                          ? styles.optionButtonActive
                          : ""
                      }`}
                      aria-label={option.label}
                      title={option.label}
                    >
                      {option.value === "left" && (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="3" y1="6" x2="21" y2="6" />
                          <line x1="3" y1="12" x2="15" y2="12" />
                          <line x1="3" y1="18" x2="18" y2="18" />
                        </svg>
                      )}
                      {option.value === "center" && (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="3" y1="6" x2="21" y2="6" />
                          <line x1="6" y1="12" x2="18" y2="12" />
                          <line x1="3" y1="18" x2="21" y2="18" />
                        </svg>
                      )}
                      {option.value === "right" && (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="3" y1="6" x2="21" y2="6" />
                          <line x1="9" y1="12" x2="21" y2="12" />
                          <line x1="6" y1="18" x2="21" y2="18" />
                        </svg>
                      )}
                      {option.value === "justify" && (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="3" y1="6" x2="21" y2="6" />
                          <line x1="3" y1="12" x2="21" y2="12" />
                          <line x1="3" y1="18" x2="21" y2="18" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.settingGroup}>
                <div className={styles.settingHeader}>
                  <label className={styles.settingLabel}>Текстийн хэмжээ</label>
                  <span className={styles.settingValue}>{settings.fontSize}px</span>
                </div>
                <input
                  type="range"
                  min="12"
                  max="32"
                  step="1"
                  value={settings.fontSize}
                  onChange={(e) =>
                    updateSetting("fontSize", parseInt(e.target.value))
                  }
                  className={styles.slider}
                />
                <div className={styles.sliderLabels}>
                  <span>12пкс</span>
                  <span>32пкс</span>
                </div>
              </div>

              <div className={styles.settingGroup}>
                <div className={styles.settingHeader}>
                  <label className={styles.settingLabel}>Мөрийн өндөр</label>
                  <span className={styles.settingValue}>{settings.lineHeight}</span>
                </div>
                <input
                  type="range"
                  min="1.2"
                  max="3"
                  step="0.1"
                  value={settings.lineHeight}
                  onChange={(e) =>
                    updateSetting("lineHeight", parseFloat(e.target.value))
                  }
                  className={styles.slider}
                />
                <div className={styles.sliderLabels}>
                  <span>1.2</span>
                  <span>3.0</span>
                </div>
              </div>

              <div className={styles.settingGroup}>
                <div className={styles.settingHeader}>
                  <label className={styles.settingLabel}>Догол мөрний зай</label>
                  <span className={styles.settingValue}>{settings.paragraphHeight}em</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="3"
                  step="0.1"
                  value={settings.paragraphHeight}
                  onChange={(e) =>
                    updateSetting("paragraphHeight", parseFloat(e.target.value))
                  }
                  className={styles.slider}
                />
                <div className={styles.sliderLabels}>
                  <span>0</span>
                  <span>3эм</span>
                </div>
              </div>

              <div className={styles.settingGroup}>
                <div className={styles.settingHeader}>
                  <label className={styles.settingLabel}>Хуудсын өргөн</label>
                  <span className={styles.settingValue}>{settings.containerWidth}px</span>
                </div>
                <input
                  type="range"
                  min="400"
                  max="1200"
                  step="50"
                  value={settings.containerWidth}
                  onChange={(e) =>
                    updateSetting("containerWidth", parseInt(e.target.value))
                  }
                  className={styles.slider}
                />
                <div className={styles.sliderLabels}>
                  <span>400пкс</span>
                  <span>1200пкс</span>
                </div>
              </div>

              <div className={styles.settingGroup}>
                <div className={styles.settingHeader}>
                  <label className={styles.settingLabel}>Үсгийн зай</label>
                  <span className={styles.settingValue}>{settings.letterSpacing}px</span>
                </div>
                <input
                  type="range"
                  min="-2"
                  max="5"
                  step="0.5"
                  value={settings.letterSpacing}
                  onChange={(e) =>
                    updateSetting("letterSpacing", parseFloat(e.target.value))
                  }
                  className={styles.slider}
                />
                <div className={styles.sliderLabels}>
                  <span>-2пкс</span>
                  <span>5пкс</span>
                </div>
              </div>

              <div className={styles.settingGroup}>
                <div className={styles.settingHeader}>
                  <label className={styles.settingLabel}>Фонтын жин</label>
                  <span className={styles.settingValue}>{settings.fontWeight}</span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="900"
                  step="100"
                  value={settings.fontWeight}
                  onChange={(e) =>
                    updateSetting("fontWeight", parseInt(e.target.value))
                  }
                  className={styles.slider}
                />
                <div className={styles.sliderLabels}>
                  <span>100</span>
                  <span>900</span>
                </div>
              </div>

              <div className={styles.settingGroup}>
                <div className={styles.settingHeader}>
                  <label className={styles.settingLabel}>Тунгалаг</label>
                  <span className={styles.settingValue}>{Math.round(settings.opacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.3"
                  max="1"
                  step="0.05"
                  value={settings.opacity}
                  onChange={(e) =>
                    updateSetting("opacity", parseFloat(e.target.value))
                  }
                  className={styles.slider}
                />
                <div className={styles.sliderLabels}>
                  <span>30%</span>
                  <span>100%</span>
                </div>
              </div>

              <div className={styles.settingGroup}>
                <div className={styles.settingHeader}>
                  <label className={styles.settingLabel}>Авто гүйлгэх</label>
                  <button
                    onClick={() => updateSetting("autoScroll", !settings.autoScroll)}
                    className={`${styles.toggle} ${
                      settings.autoScroll ? styles.toggleActive : ""
                    }`}
                  >
                    <span className={styles.toggleThumb} />
                  </button>
                </div>
                {settings.autoScroll && (
                  <div className={styles.autoScrollControls}>
                    <div className={styles.settingHeader}>
                      <span className={styles.settingLabel}>Хурд</span>
                    </div>
                    <select
                      value={settings.autoScrollSpeed}
                      onChange={(e) =>
                        updateSetting("autoScrollSpeed", parseInt(e.target.value))
                      }
                      className={styles.select}
                    >
                      <option value={1}>Удаан</option>
                      <option value={2}>Хэвийн</option>
                      <option value={3}>Хурдан</option>
                    </select>
                  </div>
                )}
              </div>

              <button onClick={resetSettings} className={styles.resetButton}>
                Үндсэн тохиргоо руу буцах
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}