"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import styles from "./history.module.css";

interface NovelInfo {
  id: string;
  title: string;
  slug: string;
}

interface ChapterInfo {
  id: string;
  chapterNumber: number;
  title: string;
}

interface CoinHistoryItem {
  id: string;
  amount: number;
  balance: number;
  type: string;
  description: string | null;
  createdAt: string;
  novel: NovelInfo | null;
  chapter: ChapterInfo | null;
  volumeChapter: ChapterInfo | null;
}

export default function CoinHistoryPage() {
  const params = useParams();
  const userId = params.userId as string;
  const { data: session } = useSession();
  const isOwner = session?.user?.id === userId;

  const [history, setHistory] = useState<CoinHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (!isOwner) {
      setLoading(false);
      return;
    }
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/users/${userId}/coins/history?page=${page}&limit=20`);
        if (res.ok) {
          const data = await res.json();
          setHistory(data.history);
          setTotalPages(data.totalPages);
        }
      } catch (error) {
        console.error("Failed to fetch coin history:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [userId, isOwner, page]);

  if (!isOwner) {
    return (
      <div className={styles.container}>
        <p className={styles.empty}>Та зөвхөн өөрийнхөө түүхийг харах боломжтой.</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Зоосны түүх</h2>
      {loading ? (
        <div className={styles.loading}>Ачааллаж байна...</div>
      ) : history.length === 0 ? (
         <div className={styles.empty}>Зоосны түүх байхгүй байна.</div>
      ) : (
        <>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Төрөл</th>
                  <th>Тоо</th>
                  <th>Үлдэгдэл</th>
                  <th>Зохиол</th>
                  <th>Бүлэг</th>
                  <th>Тайлбар</th>
                  <th>Огноо</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item) => {
                  const chapter = item.chapter || item.volumeChapter;
                  return (
                    <tr key={item.id}>
                      <td>
                        <span className={`${styles.badge} ${
                          item.type === "topup" || item.type === "reset" || item.type === "refund"
                            ? styles.income
                            : styles.expense
                        }`}>
                          {item.type === "topup"
                            ? "Цэнэглэлт"
                            : item.type === "reset"
                            ? "Reset"
                            : item.type === "refund"
                            ? "Буцаалт"
                            : "Тайлсан"}
                        </span>
                      </td>
                      <td className={`${styles.amount} ${item.amount > 0 ? styles.incomeText : styles.expenseText}`}>
                        {item.amount > 0 ? `+${item.amount}` : item.amount}
                      </td>
                      <td className={styles.balance}>{item.balance.toLocaleString()}</td>
                      <td className={styles.novelCell}>
                        {item.novel ? (
                          <Link href={`/novels/${item.novel.slug}`} className={styles.novelLink}>
                            {item.novel.title}
                          </Link>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className={styles.chapterCell}>
                        {chapter ? (
                          <span className={styles.chapterInfo}>
                            Бүлэг {chapter.chapterNumber}{chapter.title ? `: ${chapter.title}` : ""}
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className={styles.description}>{item.description || "-"}</td>
                      <td className={styles.date}>
                        {new Date(item.createdAt).toLocaleString("mn-MN")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className={styles.pageButton}
              >
                &lt;
              </button>
              <span className={styles.pageInfo}>
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className={styles.pageButton}
              >
                &gt;
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
