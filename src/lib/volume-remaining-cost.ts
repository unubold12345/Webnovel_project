import { db } from "@/lib/db";

export async function getVolumeRemainingCost(
  userId: string,
  volumeId: string,
  volumeCoinCost: number
): Promise<number> {
  const unlocked = await db.unlockedChapter.findMany({
    where: {
      userId,
      volumeChapter: { volumeId },
    },
    include: {
      volumeChapter: {
        select: { coinCost: true },
      },
    },
  });
  const totalSpent = unlocked.reduce(
    (sum, u) => sum + (u.volumeChapter?.coinCost ?? 0),
    0
  );
  return Math.max(0, volumeCoinCost - totalSpent);
}
