"use client";

import Link from "next/link";
import { useState } from "react";
import UnlockModal from "./UnlockModal";
import styles from "./ChapterNavLink.module.css";

interface TargetChapter {
  id: string;
  chapterNumber: number;
  title: string;
  isPaid: boolean;
  coinCost: number;
}

interface ChapterNavLinkProps {
  target: TargetChapter | undefined | null;
  novelSlug: string;
  direction: "prev" | "next";
  unlockedRegular: Set<string>;
  unlockedVolume: Set<string>;
  userId: string | null;
  volumeNumber?: number;
  canManage?: boolean;
  volumeUnlocked?: boolean;
}

export default function ChapterNavLink({
  target,
  novelSlug,
  direction,
  unlockedRegular,
  unlockedVolume,
  userId,
  volumeNumber,
  canManage = false,
  volumeUnlocked = false,
}: ChapterNavLinkProps) {
  const [unlockModal, setUnlockModal] = useState<{ title: string; coinCost: number; type: "chapter" | "volumeChapter"; id: string; redirectUrl: string } | null>(null);
  const [justUnlockedIds, setJustUnlockedIds] = useState<Set<string>>(new Set());

  if (!target) {
    return (
      <span className={styles.navButtonDisabled}>
        {direction === "prev" ? "<" : ">"}
      </span>
    );
  }

  const isLocked = !canManage && target.isPaid && !volumeUnlocked && !(
    volumeNumber
      ? (unlockedVolume.has(target.id) || justUnlockedIds.has(target.id))
      : (unlockedRegular.has(target.id) || justUnlockedIds.has(target.id))
  );

  const href = volumeNumber
    ? `/novels/${novelSlug}/volumes/${volumeNumber}/chapters/${target.chapterNumber}`
    : `/novels/${novelSlug}/chapters/${target.chapterNumber}`;

  const handleClick = (e: React.MouseEvent) => {
    if (!isLocked) return;
    e.preventDefault();
    if (!userId) {
      window.location.href = "/auth/login";
      return;
    }
    setUnlockModal({
      title: target.title,
      coinCost: target.coinCost,
      type: volumeNumber ? "volumeChapter" : "chapter",
      id: target.id,
      redirectUrl: href,
    });
  };

  return (
    <>
      <Link href={href} className={styles.navButton} onClick={handleClick}>
        {direction === "prev" ? "<" : ">"}
      </Link>
      {unlockModal && (
        <UnlockModal
          title={unlockModal.title}
          coinCost={unlockModal.coinCost}
          onUnlock={async () => {
            const res = await fetch("/api/chapters/unlock", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ type: unlockModal.type, id: unlockModal.id }),
            });
            const data = await res.json();
            if (!res.ok) {
              throw new Error(data.error || "Тайлахад алдаа гарлаа");
            }
            if (!data.alreadyUnlocked) {
              setJustUnlockedIds((prev) => new Set([...prev, unlockModal.id]));
            }
            return { alreadyUnlocked: data.alreadyUnlocked };
          }}
          onClose={() => setUnlockModal(null)}
          redirectUrl={unlockModal.redirectUrl}
        />
      )}
    </>
  );
}
