import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || (session.user.role !== "admin" && session.user.role !== "moderator")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { reportId, reportIds, action, reason } = await req.json();

    // Support both single reportId and array of reportIds
    const idsToProcess = reportIds || (reportId ? [reportId] : []);

    if (!idsToProcess.length || !action) {
      return NextResponse.json({ error: "Report ID(s) and action are required" }, { status: 400 });
    }

    // Fetch all reports to process
    const reports = await db.report.findMany({
      where: { id: { in: idsToProcess } },
    });

    if (reports.length === 0) {
      return NextResponse.json({ error: "No reports found" }, { status: 404 });
    }

    if (action === "dismiss") {
      // Dismiss all reports
      await db.report.updateMany({
        where: { id: { in: idsToProcess } },
        data: { status: "dismissed", resolvedAt: new Date() },
      });
      return NextResponse.json({ success: true, processedCount: reports.length });
    }

    if (action === "resolve") {
      // Resolve all reports
      await db.report.updateMany({
        where: { id: { in: idsToProcess } },
        data: { status: "resolved", resolvedAt: new Date() },
      });
      return NextResponse.json({ success: true, processedCount: reports.length });
    }

    if (action === "delete") {
      // For delete action, we need to process each report individually
      // because they might target different content types
      for (const report of reports) {
        if (report.category === "comment" && report.commentId) {
          // Check if comment is already deleted
          const comment = await db.comment.findUnique({
            where: { id: report.commentId },
          });
          if (comment && !comment.deletedAt) {
            await db.comment.update({
              where: { id: report.commentId },
              data: {
                deletedAt: new Date(),
                deletedReason: reason || "Removed due to report",
              },
            });
          }
        } else if (report.category === "review" && report.reviewId) {
          // Check if review still exists
          const review = await db.review.findUnique({
            where: { id: report.reviewId },
          });
          if (review) {
            await db.review.delete({
              where: { id: report.reviewId },
            });
          }
        }
      }

      // Mark all reports as resolved
      await db.report.updateMany({
        where: { id: { in: idsToProcess } },
        data: { status: "resolved", resolvedAt: new Date() },
      });

      return NextResponse.json({ success: true, processedCount: reports.length });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error processing report action:", error);
    return NextResponse.json(
      { error: "Failed to process report action" },
      { status: 500 }
    );
  }
}
