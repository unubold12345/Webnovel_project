"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import WebnovelForm from "@/components/admin/WebnovelForm";
import Spinner from "@/components/ui/Spinner";

export default function EditNovelPage() {
  const params = useParams();
  const novelId = params.novelId as string;
  const userId = params.userId as string;
  const [novel, setNovel] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNovel = async () => {
      const res = await fetch(`/api/user/novels/${novelId}`);
      if (res.ok) {
        const data = await res.json();
        setNovel(data);
      }
      setLoading(false);
    };
    fetchNovel();
  }, [novelId]);

  if (loading) {
    return <Spinner />;
  }

  if (!novel) {
    return <div>Зохиол олдсонгүй</div>;
  }

  return (
    <div>
      <h1>Зохиол засах - {novel.title}</h1>
      <WebnovelForm
        initialData={novel}
        basePath={`/user/${userId}`}
        mode="user"
      />
    </div>
  );
}
