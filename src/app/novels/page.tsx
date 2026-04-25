import { db } from "@/lib/db";
import { getNovelViewCounts } from "@/lib/views";
import WebnovelCard from "@/components/ui/WebnovelCard";
import styles from "./page.module.css";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface NovelsPageProps {
  searchParams: Promise<{ filter?: string; genre?: string }>;
}

export default async function NovelsPage({ searchParams }: NovelsPageProps) {
  const params = await searchParams;
  const filter = params.filter || "all";
  const selectedGenre = params.genre || "all";

  const [novels, viewCounts] = await Promise.all([
    db.webnovel.findMany({
      where: { hidden: false },
      orderBy: { createdAt: "desc" },
    }),
    getNovelViewCounts(),
  ]);

  // Extract all unique genres
  const genreSet = new Set<string>();
  novels.forEach((novel) => {
    if (novel.genres) {
      novel.genres.split(",").forEach((g) => {
        const trimmed = g.trim();
        if (trimmed) genreSet.add(trimmed);
      });
    }
  });
  const allGenres = Array.from(genreSet).sort((a, b) => a.localeCompare(b));

  const novelsWithViews = novels.map((novel) => ({
    ...novel,
    totalViews: viewCounts.get(novel.id) || 0,
  }));

  let displayedNovels = novelsWithViews;

  // Filter by genre first
  if (selectedGenre !== "all") {
    displayedNovels = displayedNovels.filter((novel) => {
      if (!novel.genres) return false;
      return novel.genres
        .split(",")
        .map((g) => g.trim().toLowerCase())
        .includes(selectedGenre.toLowerCase());
    });
  }

  // Then apply sort filter
  if (filter === "most-viewed") {
    displayedNovels = [...displayedNovels].sort((a, b) => b.totalViews - a.totalViews);
  } else if (filter === "recommended") {
    displayedNovels = [...displayedNovels].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  const tabs = [
    { key: "all", label: "Бүгд" },
    { key: "recommended", label: "Санал болгох" },
    { key: "most-viewed", label: "Хамгийн их үзсэн" },
  ];

  return (
    <div className={styles.container}>
      <h1 className={styles.pageTitle}>Зохиол</h1>

      {/* Genre filter */}
      <div className={styles.genreSection}>
        <h2 className={styles.genreTitle}>Төрөл</h2>
        <div className={styles.genreList}>
          <Link
            href={`/novels?filter=${filter}`}
            className={`${styles.genrePill} ${selectedGenre === "all" ? styles.genrePillActive : ""}`}
          >
            Бүгд
          </Link>
          {allGenres.map((genre) => (
            <Link
              key={genre}
              href={`/novels?filter=${filter}&genre=${encodeURIComponent(genre)}`}
              className={`${styles.genrePill} ${
                selectedGenre.toLowerCase() === genre.toLowerCase() ? styles.genrePillActive : ""
              }`}
            >
              {genre}
            </Link>
          ))}
        </div>
      </div>

      <div className={styles.tabs}>
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={`/novels?filter=${tab.key}${selectedGenre !== "all" ? `&genre=${encodeURIComponent(selectedGenre)}` : ""}`}
            className={`${styles.tab} ${filter === tab.key ? styles.activeTab : ""}`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <div className={styles.grid}>
        {displayedNovels.map((novel) => (
          <div key={novel.id} className={styles.cardWrapper}>
            <WebnovelCard novel={novel} />
          </div>
        ))}
      </div>

      {displayedNovels.length === 0 && (
        <p className={styles.emptyState}>Тохирох зохиол олдсонгүй.</p>
      )}
    </div>
  );
}
