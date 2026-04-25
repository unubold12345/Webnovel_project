#!/usr/bin/env node
/**
 * Admin shell script to reset a user's unlocked chapters and coin history.
 *
 * Usage:
 *   node scripts/reset-user-chapters.js <userId>
 *
 * Example:
 *   node scripts/reset-user-chapters.js cuid_123456789
 */

const userId = process.argv[2];

if (!userId) {
  console.error("Usage: node scripts/reset-user-chapters.js <userId>");
  process.exit(1);
}

async function main() {
  // We need to be logged in as admin to call this API.
  // This script uses the same Next.js API endpoint.
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const url = `${baseUrl}/api/admin/users/${userId}/reset-chapters`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Error:", data.error || "Unknown error");
      process.exit(1);
    }

    console.log("✅ Success:", data.message);
    console.log("   Refunded coins:", data.refundedCoins);
    console.log("   New balance:", data.newBalance);
    console.log("   Deleted unlocked chapters:", data.deletedUnlockedCount);
    console.log("   Deleted history entries:", data.deletedHistoryCount);
  } catch (err) {
    console.error("Request failed:", err);
    process.exit(1);
  }
}

main();
