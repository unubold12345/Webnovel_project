"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import WebnovelCard from "./WebnovelCard";
import styles from "./NovelCarousel.module.css";

interface NovelCarouselProps {
  title: string;
  novels: Array<{
    id: string;
    title: string;
    slug: string;
    author: string;
    thumbnail: string;
    totalViews: number;
  }>;
  viewMoreHref?: string;
}

export default function NovelCarousel({ title, novels, viewMoreHref }: NovelCarouselProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [showLeftButton, setShowLeftButton] = useState(false);
  const [showRightButton, setShowRightButton] = useState(true);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const handleScroll = () => {
      const { scrollLeft, scrollWidth, clientWidth } = scroller;
      setShowLeftButton(scrollLeft > 0);
      setShowRightButton(scrollLeft < scrollWidth - clientWidth - 10);
    };

    handleScroll();
    scroller.addEventListener("scroll", handleScroll);
    return () => scroller.removeEventListener("scroll", handleScroll);
  }, []);

  const scroll = (direction: "left" | "right") => {
    if (scrollerRef.current) {
      const scrollAmount = scrollerRef.current.clientWidth * 0.75;
      scrollerRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className={styles.container}>
      {viewMoreHref ? (
        <div className={styles.header}>
          <h2 className={styles.title}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
            </svg>
            {title}
          </h2>
          <Link href={viewMoreHref} className={styles.viewMore}>
            Бүгдийг харах →
          </Link>
        </div>
      ) : (
        <h2 className={styles.title}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
          </svg>
          {title}
        </h2>
      )}
      <div className={styles.wrapper}>
        {showLeftButton && (
          <button
            className={`${styles.button} ${styles.buttonLeft}`}
            onClick={() => scroll("left")}
            aria-label="Scroll left"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        )}
        <div className={styles.scroller} ref={scrollerRef}>
          <div className={styles.grid}>
            {novels.map((novel) => (
              <div key={novel.id} className={styles.item}>
                <WebnovelCard novel={novel} />
              </div>
            ))}
          </div>
        </div>
        {showRightButton && (
          <button
            className={`${styles.button} ${styles.buttonRight}`}
            onClick={() => scroll("right")}
            aria-label="Scroll right"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}