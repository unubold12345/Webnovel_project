import { db } from "./db";

export async function getNovelViewCounts(): Promise<Map<string, number>> {
  const [chapterViews, volumeChapterViews, volumes] = await Promise.all([
    db.chapter.groupBy({
      by: ["novelId"],
      _sum: { viewCount: true },
    }),
    db.volumeChapter.groupBy({
      by: ["volumeId"],
      _sum: { viewCount: true },
    }),
    db.volume.findMany({
      select: { id: true, novelId: true },
    }),
  ]);

  const volumeToNovel = new Map(volumes.map((v) => [v.id, v.novelId]));
  const viewMap = new Map<string, number>();

  for (const cv of chapterViews) {
    viewMap.set(cv.novelId, (viewMap.get(cv.novelId) || 0) + (cv._sum.viewCount || 0));
  }

  for (const vcv of volumeChapterViews) {
    const novelId = volumeToNovel.get(vcv.volumeId);
    if (novelId) {
      viewMap.set(novelId, (viewMap.get(novelId) || 0) + (vcv._sum.viewCount || 0));
    }
  }

  return viewMap;
}