"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Toast, useToast } from "@/components/ui/Toast";
import styles from "./page.module.css";

interface Novel {
  id: string;
  title: string;
  slug: string;
  totalChapters: number;
  totalVolumes: number;
}

interface Chapter {
  id: string;
  chapterNumber: number;
  title: string;
  isPaid: boolean;
  coinCost: number;
  viewCount: number;
  createdAt: string;
}

interface Volume {
  id: string;
  volumeNumber: number;
  title: string;
  isPaid: boolean;
  coinCost: number;
  chapters: Chapter[];
}

export default function AdminPaidChaptersPage() {
  const { data: session } = useSession();
  const [novels, setNovels] = useState<Novel[]>([]);
  const [selectedNovelId, setSelectedNovelId] = useState<string>("");
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [volumes, setVolumes] = useState<Volume[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkIsPaid, setBulkIsPaid] = useState<boolean>(true);
  const [bulkCoinCost, setBulkCoinCost] = useState<string>("10");
  const [volumeModal, setVolumeModal] = useState<{
    open: boolean;
    volume: Volume | null;
    modalIsPaid: boolean;
    modalCoinCost: string;
  }>({ open: false, volume: null, modalIsPaid: false, modalCoinCost: "10" });
  // Track free chapter toggles for paid volumes: volumeId -> Set<chapterId>
  const [paidVolumeFreeChapters, setPaidVolumeFreeChapters] = useState<Record<string, Set<string>>>({});
  const [savingVolumeId, setSavingVolumeId] = useState<string | null>(null);
  const { addToast } = useToast();

  useEffect(() => {
    fetchNovels();
  }, []);

  useEffect(() => {
    if (selectedNovelId) {
      fetchChapters(selectedNovelId);
    } else {
      setChapters([]);
      setVolumes([]);
      setSelected(new Set());
      setPaidVolumeFreeChapters({});
    }
  }, [selectedNovelId]);

  const fetchNovels = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/chapters/paid");
    if (res.ok) {
      const data = await res.json();
      setNovels(data.novels || []);
    }
    setLoading(false);
  };

  const fetchChapters = async (novelId: string) => {
    setLoading(true);
    const res = await fetch(`/api/admin/chapters/paid?novelId=${novelId}`);
    if (res.ok) {
      const data = await res.json();
      setChapters(data.chapters || []);
      setVolumes(data.volumes || []);
      setSelected(new Set());
      // Initialize free chapter tracking for paid volumes
      const freeMap: Record<string, Set<string>> = {};
      (data.volumes || []).forEach((volume: Volume) => {
        if (volume.isPaid) {
          freeMap[volume.id] = new Set(
            volume.chapters.filter((c) => !c.isPaid).map((c) => c.id)
          );
        }
      });
      setPaidVolumeFreeChapters(freeMap);
    }
    setLoading(false);
  };

  const toggleSelect = (type: "chapter" | "volumeChapter", id: string) => {
    const key = `${type}:${id}`;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    const allKeys: string[] = [];
    chapters.forEach((c) => allKeys.push(`chapter:${c.id}`));
    volumes.forEach((v) => {
      if (!v.isPaid) {
        v.chapters.forEach((c) => allKeys.push(`volumeChapter:${c.id}`));
      }
    });

    if (selected.size === allKeys.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(allKeys));
    }
  };

  const toggleSelectVolume = (volume: Volume) => {
    if (volume.isPaid) return; // Disable bulk select for paid volumes
    const volumeKeys = volume.chapters.map((c) => `volumeChapter:${c.id}`);
    const allSelected = volumeKeys.every((k) => selected.has(k));

    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        volumeKeys.forEach((k) => next.delete(k));
      } else {
        volumeKeys.forEach((k) => next.add(k));
      }
      return next;
    });
  };

  const handleApply = async () => {
    if (selected.size === 0) {
      addToast("Дор хаяж нэг бүлэг сонгоно уу", "error");
      return;
    }

    const updates: Array<{
      type: "chapter" | "volumeChapter";
      id: string;
      isPaid: boolean;
      coinCost: number;
    }> = [];

    selected.forEach((key) => {
      const [type, id] = key.split(":") as ["chapter" | "volumeChapter", string];
      updates.push({
        type,
        id,
        isPaid: bulkIsPaid,
        coinCost: parseInt(bulkCoinCost, 10) || 0,
      });
    });

    setSaving(true);
    try {
      const res = await fetch("/api/admin/chapters/paid", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });

      if (res.ok) {
        await fetchChapters(selectedNovelId);
        addToast(
          `${selected.size} бүлэгт ${bulkIsPaid ? "төлбөртэй" : "үнэгүй"} тохиргоо амжилттай хийгдлээ`,
          "success"
        );
        setSelected(new Set());
      } else {
        addToast("Хадгалахад алдаа гарлаа", "error");
      }
    } catch {
      addToast("Хадгалахад алдаа гарлаа", "error");
    } finally {
      setSaving(false);
    }
  };

  const openVolumeModal = (volume: Volume) => {
    setVolumeModal({
      open: true,
      volume,
      modalIsPaid: volume.isPaid,
      modalCoinCost: String(volume.coinCost || 10),
    });
  };

  const closeVolumeModal = () => {
    setVolumeModal({ open: false, volume: null, modalIsPaid: false, modalCoinCost: "10" });
  };

  const handleVolumeModalSave = async () => {
    if (!volumeModal.volume) return;
    const res = await fetch("/api/admin/chapters/paid", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        updates: [{
          type: "volume",
          id: volumeModal.volume.id,
          isPaid: volumeModal.modalIsPaid,
          coinCost: parseInt(volumeModal.modalCoinCost, 10) || 0,
        }],
      }),
    });
    if (res.ok) {
      await fetchChapters(selectedNovelId);
      addToast("Амжилттай хадгалагдлаа", "success");
      closeVolumeModal();
    } else {
      addToast("Хадгалахад алдаа гарлаа", "error");
    }
  };

  const togglePaidVolumeFreeChapter = (volumeId: string, chapterId: string) => {
    setPaidVolumeFreeChapters((prev) => {
      const next = { ...prev };
      const set = new Set(next[volumeId] || []);
      if (set.has(chapterId)) {
        set.delete(chapterId);
      } else {
        set.add(chapterId);
      }
      next[volumeId] = set;
      return next;
    });
  };

  const handleSavePaidVolumeFreeChapters = async (volume: Volume) => {
    const freeIds = paidVolumeFreeChapters[volume.id] || new Set();
    const updates = volume.chapters.map((chapter) => ({
      type: "volumeChapter" as const,
      id: chapter.id,
      isPaid: !freeIds.has(chapter.id),
      coinCost: chapter.coinCost || 10,
    }));

    setSavingVolumeId(volume.id);
    try {
      const res = await fetch("/api/admin/chapters/paid", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });
      if (res.ok) {
        await fetchChapters(selectedNovelId);
        addToast(`"${volume.title}" ботийн тохиргоо амжилттай хадгалагдлаа`, "success");
      } else {
        addToast("Хадгалахад алдаа гарлаа", "error");
      }
    } catch {
      addToast("Хадгалахад алдаа гарлаа", "error");
    } finally {
      setSavingVolumeId(null);
    }
  };

  const selectedNovel = novels.find((n) => n.id === selectedNovelId);

  const allCount =
    chapters.length +
    volumes.reduce((sum, v) => sum + (v.isPaid ? 0 : v.chapters.length), 0);

  if (session?.user?.role !== "admin") {
    return (
      <div className={styles.container}>
        <p className={styles.empty}>Хандах эрхгүй. Зөвхөн админ хандана.</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Төлбөртэй бүлэг</h1>

      <div className={styles.novelSelect}>
        <label className={styles.label}>Novel сонгох:</label>
        <select
          value={selectedNovelId}
          onChange={(e) => setSelectedNovelId(e.target.value)}
          className={styles.select}
        >
          <option value="">-- Novel сонгох --</option>
          {novels.map((novel) => (
            <option key={novel.id} value={novel.id}>
              {novel.title}
            </option>
          ))}
        </select>
      </div>

      {selectedNovel && (
        <div className={styles.bulkActions}>
          <div className={styles.bulkRow}>
            <div className={styles.bulkField}>
              <label className={styles.label}>Төлөв:</label>
              <select
                value={bulkIsPaid ? "paid" : "free"}
                onChange={(e) => setBulkIsPaid(e.target.value === "paid")}
                className={styles.select}
              >
                <option value="paid">Төлбөртэй</option>
                <option value="free">Үнэгүй</option>
              </select>
            </div>
            <div className={styles.bulkField}>
              <label className={styles.label}>Coin үнэ:</label>
              <input
                type="number"
                value={bulkCoinCost}
                onChange={(e) => setBulkCoinCost(e.target.value)}
                className={styles.coinInput}
                min="0"
              />
            </div>
            <button
              onClick={handleApply}
              disabled={saving || selected.size === 0}
              className={styles.applyButton}
            >
              {saving ? "Хадгалж байна..." : `Сонгосон ${selected.size} бүлэгт хадгалах`}
            </button>
          </div>
        </div>
      )}

      {selectedNovelId && loading ? (
        <p className={styles.loading}>Ачаалж байна...</p>
      ) : selectedNovelId && allCount === 0 && volumes.every((v) => v.isPaid) ? (
        <p className={styles.empty}>Бүлэг олдсонгүй</p>
      ) : selectedNovelId ? (
        <div className={styles.chapterList}>
          <div className={styles.selectAllRow}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={selected.size === allCount && allCount > 0}
                onChange={toggleSelectAll}
                className={styles.checkbox}
              />
              <span>Бүгдийг сонгох</span>
            </label>
            <span className={styles.selectedCount}>
              Сонгосон: {selected.size} / {allCount}
            </span>
          </div>

          {chapters.length > 0 && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>
                Энгийн бүлэг ({chapters.length})
              </h2>
              <div className={styles.grid}>
                {chapters.map((chapter) => {
                  const key = `chapter:${chapter.id}`;
                  const isSelected = selected.has(key);
                  return (
                    <label
                      key={key}
                      className={`${styles.chapterCard} ${
                        isSelected ? styles.selected : ""
                      } ${chapter.isPaid ? styles.paid : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() =>
                          toggleSelect("chapter", chapter.id)
                        }
                        className={styles.cardCheckbox}
                      />
                      <div className={styles.cardInfo}>
                        <span className={styles.chapterNumber}>
                          #{chapter.chapterNumber}
                        </span>
                        <span className={styles.chapterTitle}>
                          {chapter.title}
                        </span>
                        <span className={styles.chapterMeta}>
                          {chapter.isPaid ? (
                            <span className={styles.paidBadge}>
                              {chapter.coinCost} coin
                            </span>
                          ) : (
                            <span className={styles.freeBadge}>Үнэгүй</span>
                          )}
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {volumes.map((volume) => {
            const volumeKeys = volume.chapters.map((c) => `volumeChapter:${c.id}`);
            const volumeSelectedCount = volumeKeys.filter((k) => selected.has(k)).length;
            const allVolumeSelected = volumeSelectedCount === volume.chapters.length && volume.chapters.length > 0;
            return (
            <div key={volume.id} className={styles.section}>
              <div className={styles.volumeHeader}>
                <div className={styles.volumeInfoHeader}>
                  <h2 className={styles.sectionTitle}>
                    Volume {volume.volumeNumber}: {volume.title} ({volume.chapters.length})
                  </h2>
                  <div className={styles.volumePricing}>
                    <span className={volume.isPaid ? styles.paidBadge : styles.freeBadge}>
                      {volume.isPaid ? `${volume.coinCost} coin` : "Үнэгүй"}
                    </span>
                    <button
                      onClick={() => openVolumeModal(volume)}
                      className={styles.volumePricingBtn}
                    >
                      {volume.isPaid ? "Үнэ өөрчлөх" : "Төлбөртэй болгох"}
                    </button>
                  </div>
                </div>
                {!volume.isPaid && (
                  <label className={styles.volumeSelectLabel}>
                    <input
                      type="checkbox"
                      checked={allVolumeSelected}
                      onChange={() => toggleSelectVolume(volume)}
                      className={styles.checkbox}
                    />
                    <span>{allVolumeSelected ? "Сонголтыг цуцлах" : "Бүгдийг сонгох"}</span>
                  </label>
                )}
              </div>

              {volume.isPaid ? (
                /* Paid volume: show free chapter toggles */
                <div className={styles.paidVolumeChapters}>
                  <p className={styles.paidVolumeHint}>
                    Энэ боть бүхэлдээ төлбөртэй. Үнэгүй болгох бүлгийг доороос сонгоно уу.
                  </p>
                  <div className={styles.freeChapterList}>
                    {volume.chapters.map((chapter) => {
                      const freeIds = paidVolumeFreeChapters[volume.id] || new Set();
                      const isFree = freeIds.has(chapter.id);
                      return (
                        <div
                          key={chapter.id}
                          className={`${styles.freeChapterRow} ${isFree ? styles.freeChapterRowFree : ""}`}
                        >
                          <span className={styles.freeChapterInfo}>
                            <span className={styles.chapterNumber}>#{chapter.chapterNumber}</span>
                            <span className={styles.chapterTitle}>{chapter.title}</span>
                          </span>
                          <label className={styles.freeChapterToggle}>
                            <input
                              type="checkbox"
                              checked={isFree}
                              onChange={() => togglePaidVolumeFreeChapter(volume.id, chapter.id)}
                              className={styles.checkbox}
                            />
                            <span>Үнэгүй</span>
                          </label>
                        </div>
                      );
                    })}
                  </div>
                  <div className={styles.paidVolumeActions}>
                    <button
                      onClick={() => handleSavePaidVolumeFreeChapters(volume)}
                      disabled={savingVolumeId === volume.id}
                      className={styles.applyButton}
                    >
                      {savingVolumeId === volume.id ? "Хадгалж байна..." : "Хадгалах"}
                    </button>
                  </div>
                </div>
              ) : (
                /* Unpaid volume: show regular checkbox grid */
                <div className={styles.grid}>
                  {volume.chapters.map((chapter) => {
                    const key = `volumeChapter:${chapter.id}`;
                    const isSelected = selected.has(key);
                    return (
                      <label
                        key={key}
                        className={`${styles.chapterCard} ${
                          isSelected ? styles.selected : ""
                        } ${chapter.isPaid ? styles.paid : ""}`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() =>
                            toggleSelect("volumeChapter", chapter.id)
                          }
                          className={styles.cardCheckbox}
                        />
                        <div className={styles.cardInfo}>
                          <span className={styles.chapterNumber}>
                            #{chapter.chapterNumber}
                          </span>
                          <span className={styles.chapterTitle}>
                            {chapter.title}
                          </span>
                          <span className={styles.chapterMeta}>
                            {chapter.isPaid ? (
                              <span className={styles.paidBadge}>
                                {chapter.coinCost} coin
                              </span>
                            ) : (
                              <span className={styles.freeBadge}>Үнэгүй</span>
                            )}
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          );
          })}
        </div>
      ) : null}

      {/* Volume Pricing Modal */}
      {volumeModal.open && volumeModal.volume && (
        <div className={styles.modalOverlay} onClick={closeVolumeModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                Volume {volumeModal.volume.volumeNumber}: {volumeModal.volume.title}
              </h2>
              <button onClick={closeVolumeModal} className={styles.modalClose}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className={styles.modalBody}>
              <label className={styles.checkboxLabel} style={{ marginBottom: "1rem" }}>
                <input
                  type="checkbox"
                  checked={volumeModal.modalIsPaid}
                  onChange={(e) => setVolumeModal((prev) => ({ ...prev, modalIsPaid: e.target.checked }))}
                  className={styles.checkbox}
                />
                <span>Төлбөртэй болгох</span>
              </label>
              {volumeModal.modalIsPaid && (
                <div className={styles.modalField}>
                  <label className={styles.label}>Coin үнэ:</label>
                  <input
                    type="number"
                    value={volumeModal.modalCoinCost}
                    onChange={(e) => setVolumeModal((prev) => ({ ...prev, modalCoinCost: e.target.value }))}
                    className={styles.coinInput}
                    min="0"
                  />
                </div>
              )}
            </div>
            <div className={styles.modalFooter}>
              <button onClick={closeVolumeModal} className={styles.cancelButton}>
                Болих
              </button>
              <button onClick={handleVolumeModalSave} className={styles.applyButton}>
                Хадгалах
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
