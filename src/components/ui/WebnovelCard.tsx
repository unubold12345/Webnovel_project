import Link from "next/link";
import Image from "next/image";
import styles from "./WebnovelCard.module.css";

interface WebnovelCardProps {
  novel: {
    id: string;
    title: string;
    slug: string;
    author: string;
    thumbnail: string;
    totalViews: number;
  };
}

export default function WebnovelCard({ novel }: WebnovelCardProps) {
  return (
    <Link href={`/novels/${novel.slug}`} className={styles.card}>
      <div className={styles.thumbnailWrapper}>
        {novel.thumbnail ? (
          <Image
            src={novel.thumbnail}
            alt={novel.title}
            fill
            className={styles.thumbnail}
          />
        ) : (
          <div className={styles.placeholder}>{novel.title.charAt(0)}</div>
        )}
      </div>
      <div className={styles.content}>
        <h3 className={styles.title}>{novel.title}</h3>
        <p className={styles.author}>{novel.author}</p>
        <div className={styles.meta}>
          <span className={styles.viewCount}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            {novel.totalViews}
          </span>
        </div>
      </div>
    </Link>
  );
}