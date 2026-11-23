"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { PageContainer } from "@/components/common/page-container";
import { LoadingState } from "@/components/common/states";

export default function RedirectToAi() {
  const router = useRouter();
  const params = useParams();

  useEffect(() => {
    const rawId = params?.id;
    const lessonId = Array.isArray(rawId) ? rawId[0] : rawId;
    if (lessonId) {
      router.replace(`/s/ai?lessonId=${lessonId}`);
    } else {
      router.replace("/s/ai");
    }
  }, [params, router]);

  return <PageContainer><LoadingState label="กำลังนำทางไปยังห้องแชท AI..." /></PageContainer>;
}
