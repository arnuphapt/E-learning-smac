"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Loading from "@/components/ui/Loading";

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

  return <Loading text="กำลังนำทางไปยังห้องแชท AI..." fullHeight />;
}
