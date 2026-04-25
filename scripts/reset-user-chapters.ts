/**
 * Admin shell script to reset a user's unlocked chapters and coin history.
 *
 * Usage:
 *   npx tsx scripts/reset-user-chapters.ts <userId>
 *
 * Example:
 *   npx tsx scripts/reset-user-chapters.ts cuid_123456789
 */

import { db } from "../src/lib/db";

const userId = process.argv[2];

if (!userId) {
  console.error("Usage: npx tsx scripts/reset-user-chapters.ts <userId>");
  process.exit(1);
}

async function main() {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, coins: true },
  });

  if (!user) {
    console.error("❌ User not found:", userId);
    process.exit(1);
  }

  // Calculate total coins spent on unlocks
  const spentAgg = await db.coinHistory.aggregate({
    where: { userId, type: "unlock" },
    _sum: { amount: true },
  });
  const totalSpent = Math.abs(spentAgg._sum.amount ?? 0);

  const result = await db.$transaction(async (tx) => {
    // 1. Delete all unlocked chapters and volumes
    const deletedUnlocked = await tx.unlockedChapter.deleteMany({
      where: { userId },
    });
    const deletedVolumes = await tx.unlockedVolume.deleteMany({
      where: { userId },
    });

    // 2. Delete all coin history
    const deletedHistory = await tx.coinHistory.deleteMany({
      where: { userId },
    });

    // 3. Refund spent coins
    let newBalance = user.coins;
    if (totalSpent > 0) {
      const updated = await tx.user.update({
        where: { id: userId },
        data: { coins: { increment: totalSpent } },
      });
      newBalance = updated.coins;
    }

    return {
      deletedUnlockedCount: deletedUnlocked.count,
      deletedVolumeCount: deletedVolumes.count,
      deletedHistoryCount: deletedHistory.count,
      refundedCoins: totalSpent,
      newBalance,
    };
  });

  console.log(`✅ Reset user "${user.username}" (${userId}):`);
  console.log(`   • Deleted unlocked chapters: ${result.deletedUnlockedCount}`);
  console.log(`   • Deleted unlocked volumes:  ${result.deletedVolumeCount}`);
  console.log(`   • Deleted history entries:   ${result.deletedHistoryCount}`);
  console.log(`   • Refunded coins:            ${result.refundedCoins}`);
  console.log(`   • New coin balance:          ${result.newBalance}`);

  await db.$disconnect();
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
