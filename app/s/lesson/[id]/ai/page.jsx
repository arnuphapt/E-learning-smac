"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Loading from "@/components/ui/Loading";

export default function RedirectToAi() {
  const router = useRouter();
  const params = useParams();

  useEffect(() => {
    const lessonId = params?.id;
    if (lessonId) {
      router.replace(`/s/ai?lessonId=${lessonId}`);
    } else {
      router.replace("/s/ai");
    }
  }, [params, router]);

  return <Loading text="กำลังนำทางไปยังห้องแชท AI..." fullHeight />;
}
