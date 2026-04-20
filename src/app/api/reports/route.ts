import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { commentId, chapterId, reviewId, reason, category } = await req.json();

    if (!reason) {
      return NextResponse.json({ error: "Reason is required" }, { status: 400 });
    }

    if (reviewId || category === "review") {
      // Report a review
      const targetReviewId = reviewId;
      if (!targetReviewId) {
        return NextResponse.json({ error: "Review ID is required" }, { status: 400 });
      }

      const review = await db.review.findUnique({
        where: { id: targetReviewId },
      });

      if (!review) {
        return NextResponse.json({ error: "Review not found" }, { status: 404 });
      }

      if (review.userId === session.user.id) {
        return NextResponse.json({ error: "Cannot report your own review" }, { status: 400 });
      }

      const existingReport = await db.report.findFirst({
        where: {
          reporterId: session.user.id,
          reviewId: targetReviewId,
          status: "pending",
        },
      });

      if (existingReport) {
        return NextResponse.json({ error: "You have already reported this review" }, { status: 400 });
      }

      await db.report.create({
        data: {
          reporterId: session.user.id,
          reviewId: targetReviewId,
          reason,
          category: "review",
        },
      });
    } else if (commentId) {
      const comment = await db.comment.findUnique({
        where: { id: commentId },
      });

      if (!comment) {
        return NextResponse.json({ error: "Comment not found" }, { status: 404 });
      }

      if (comment.userId === session.user.id) {
        return NextResponse.json({ error: "Cannot report your own comment" }, { status: 400 });
      }

      const existingReport = await db.report.findFirst({
        where: {
          reporterId: session.user.id,
          commentId,
          status: "pending",
        },
      });

      if (existingReport) {
        return NextResponse.json({ error: "You have already reported this comment" }, { status: 400 });
      }

      await db.report.create({
        data: {
          reporterId: session.user.id,
          commentId,
          reason,
          category: "comment",
        },
      });
    } else if (chapterId) {
      // First check if it's a regular chapter
      let chapter = await db.chapter.findUnique({
        where: { id: chapterId },
      });

      // If not found, check if it's a volume chapter
      let volumeChapter = null;
      if (!chapter) {
        volumeChapter = await db.volumeChapter.findUnique({
          where: { id: chapterId },
        });
      }

      if (!chapter && !volumeChapter) {
        return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
      }

      // Check for existing report
      const existingReport = chapter 
        ? await db.report.findFirst({
            where: {
              reporterId: session.user.id,
              chapterId,
              status: "pending",
            },
          })
        : await db.report.findFirst({
            where: {
              reporterId: session.user.id,
              volumeChapterId: chapterId,
              status: "pending",
            },
          });

      if (existingReport) {
        return NextResponse.json({ error: "You have already reported this chapter" }, { status: 400 });
      }

      if (volumeChapter) {
        // For volume chapters, store in volumeChapterId field
        await db.report.create({
          data: {
            reporterId: session.user.id,
            volumeChapterId: chapterId,
            reason,
            category: "chapter",
          },
        });
      } else {
        await db.report.create({
          data: {
            reporterId: session.user.id,
            chapterId,
            reason,
            category: "chapter",
          },
        });
      }
    } else {
      return NextResponse.json({ error: "Comment ID, Chapter ID, or Review ID is required" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error submitting report:", error);

    // Handle Prisma unique constraint error
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "You have already reported this item" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to submit report" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || (session.user.role !== "admin" && session.user.role !== "moderator")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const status = searchParams.get("status") || "pending";
    const category = searchParams.get("category") || "all";
    const groupByTarget = searchParams.get("groupByTarget") !== "false"; // Default to true
    const limit = 10;
    const offset = (page - 1) * limit;

    const whereClause: Record<string, unknown> = {};
    if (status !== "all") {
      whereClause.status = status;
    }
    if (category !== "all") {
      whereClause.category = category;
    }

    const [reports, totalCount] = await Promise.all([
      db.report.findMany({
        where: whereClause,
        include: {
          comment: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  avatar: true,
                },
              },
              novel: {
                select: {
                  id: true,
                  title: true,
                  slug: true,
                },
              },
              chapter: {
                select: {
                  id: true,
                  title: true,
                  chapterNumber: true,
                },
              },
            },
          },
          chapter: {
            include: {
              novel: {
                select: {
                  id: true,
                  title: true,
                  slug: true,
                },
              },
            },
          },
          volumeChapter: {
            include: {
              volume: {
                include: {
                  novel: {
                    select: {
                      id: true,
                      title: true,
                      slug: true,
                    },
                  },
                },
              },
            },
          },
          review: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  avatar: true,
                },
              },
              novel: {
                select: {
                  id: true,
                  title: true,
                  slug: true,
                },
              },
            },
          },
          reporter: {
            select: {
              id: true,
              username: true,
              avatar: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      db.report.count({ where: whereClause }),
    ]);

    // Group reports by target if requested
    let processedReports = reports;
    let groupedReports: any[] = [];

    if (groupByTarget) {
      const reportGroups = new Map<string, any>();

      reports.forEach((report) => {
        // Create a unique key based on the target type and ID
        let targetKey = "";
        let targetData = null;

        if (report.category === "comment" && report.comment) {
          targetKey = `comment-${report.comment.id}`;
          targetData = report.comment;
        } else if (report.category === "review" && report.review) {
          targetKey = `review-${report.review.id}`;
          targetData = report.review;
        } else if (report.category === "chapter" && report.chapter) {
          targetKey = `chapter-${report.chapter.id}`;
          targetData = report.chapter;
        } else if (report.category === "chapter" && report.volumeChapter) {
          // Handle volume chapter reports using the new relation
          const volumeChapter = report.volumeChapter;
          targetKey = `volume-chapter-${volumeChapter.id}`;
          targetData = {
            id: volumeChapter.id,
            chapterNumber: volumeChapter.chapterNumber,
            title: volumeChapter.title,
            novel: volumeChapter.volume?.novel,
            isVolumeChapter: true,
            volume: volumeChapter.volume,
          };
        } else {
          // Fallback for reports without valid targets
          targetKey = report.id;
        }

        if (!reportGroups.has(targetKey)) {
          reportGroups.set(targetKey, {
            id: report.id, // Use first report ID as group ID
            targetId: targetKey,
            category: report.category,
            status: report.status,
            createdAt: report.createdAt,
            target: targetData,
            reportCount: 0,
            reports: [],
            // Include first reporter info for display
            reporter: report.reporter,
          });
        }

        const group = reportGroups.get(targetKey);
        group.reportCount++;
        group.reports.push({
          id: report.id,
          reason: report.reason,
          createdAt: report.createdAt,
          reporter: report.reporter,
        });
      });

      // Convert map to array and apply pagination
      groupedReports = Array.from(reportGroups.values());
      
      // Sort by latest report date
      groupedReports.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // Apply pagination
      const totalGroupedCount = groupedReports.length;
      const totalGroupedPages = Math.ceil(totalGroupedCount / limit);
      const paginatedGroups = groupedReports.slice(offset, offset + limit);

      return NextResponse.json({
        reports: paginatedGroups,
        totalPages: totalGroupedPages,
        currentPage: page,
        totalCount: totalGroupedCount,
        isGrouped: true,
      });
    }

    // Standard pagination for non-grouped view
    const paginatedReports = processedReports.slice(offset, offset + limit);
    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      reports: paginatedReports,
      totalPages,
      currentPage: page,
      totalCount,
      isGrouped: false,
    });
  } catch (error) {
    console.error("Error fetching reports:", error);
    return NextResponse.json(
      { error: "Failed to fetch reports" },
      { status: 500 }
    );
  }
}
