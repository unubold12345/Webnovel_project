import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = await params;

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, coins: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Find the most recent reset entry to avoid double-refunding
    const lastReset = await db.coinHistory.findFirst({
      where: { userId, type: "reset" },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });

    // Calculate total coins spent on unlocks since last reset
    const spentAgg = await db.coinHistory.aggregate({
      where: {
        userId,
        type: "unlock",
        ...(lastReset ? { createdAt: { gt: lastReset.createdAt } } : {}),
      },
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

      // 2. Refund spent coins (add back to balance)
      let newBalance = user.coins;
      if (totalSpent > 0) {
        const updated = await tx.user.update({
          where: { id: userId },
          data: { coins: { increment: totalSpent } },
        });
        newBalance = updated.coins;
      }

      // 3. Add reset entry to coin history (keep all existing history)
      let resetEntry = null;
      const totalDeleted = deletedUnlocked.count + deletedVolumes.count;
      if (totalSpent > 0) {
        resetEntry = await tx.coinHistory.create({
          data: {
            userId,
            amount: totalSpent,
            balance: newBalance,
            type: "reset",
            description: `Админ reset хийсэн: ${deletedUnlocked.count} бүлэг + ${deletedVolumes.count} боть тайлагдсан, ${totalSpent} coin буцаан олгогдлоо.`,
          },
        });
      }

      return {
        deletedUnlockedCount: deletedUnlocked.count,
        deletedVolumeCount: deletedVolumes.count,
        refundedCoins: totalSpent,
        newBalance,
        resetEntryId: resetEntry?.id ?? null,
      };
    });

    return NextResponse.json({
      success: true,
      message: `"${user.username}" хэрэглэгчийн ${result.deletedUnlockedCount} бүлэг, ${result.deletedVolumeCount} боть reset хийгдэж, ${result.refundedCoins} coin буцаан олгогдлоо.`,
      ...result,
    });
  } catch (error) {
    console.error("Error resetting user chapters:", error);
    return NextResponse.json(
      { error: "Failed to reset user chapters" },
      { status: 500 }
    );
  }
}
