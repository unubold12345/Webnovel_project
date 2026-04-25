"use client";

import { useState, type ReactNode } from "react";
import styles from "./PaginatedWrapper.module.css";

interface PaginatedWrapperProps {
  children: ReactNode;
  itemsPerPage?: number;
  tableColSpan?: number;
  emptyMessage?: ReactNode;
}

export default function PaginatedWrapper({
  children,
  itemsPerPage = 10,
  tableColSpan,
  emptyMessage,
}: PaginatedWrapperProps) {
  const [page, setPage] = useState(1);
  const all = Array.isArray(children) ? children.filter(Boolean) : children ? [children] : [];
  const total = all.length;
  const totalPages = Math.ceil(total / itemsPerPage);
  const visible = all.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  if (total === 0) {
    return emptyMessage ? <>{emptyMessage}</> : null;
  }

  const goPrev = () => setPage((p) => Math.max(1, p - 1));
  const goNext = () => setPage((p) => Math.min(totalPages, p + 1));

  const controls = (
    <div className={styles.pagination}>
      <button
        type="button"
        className={styles.pageBtn}
        onClick={goPrev}
        disabled={page === 1}
        aria-label="Өмнөх"
      >
        ←
      </button>
      <span className={styles.pageInfo}>
        {page} / {totalPages}
      </span>
      <button
        type="button"
        className={styles.pageBtn}
        onClick={goNext}
        disabled={page === totalPages}
        aria-label="Дараах"
      >
        →
      </button>
    </div>
  );

  return (
    <>
      {visible}
      {totalPages > 1 &&
        (tableColSpan ? (
          <tr>
            <td colSpan={tableColSpan} className={styles.paginationCell}>
              {controls}
            </td>
          </tr>
        ) : (
          controls
        ))}
    </>
  );
}
