"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { BellIcon } from "lucide-react";
import { PageContainer } from "@/components/common/page-container";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState, LoadingState } from "@/components/common/states";
import { BroadcastCard } from "@/components/student/broadcast-card";
import { DEFAULT_DOMAIN } from "@/lib/course-access";
import type { Database } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";
import { matchesYearLevel } from "@/lib/year-level";

type BroadcastRow = Database["public"]["Tables"]["broadcasts"]["Row"];

export default function StudentBroadcastsPage() {
  const { data: session, status: authStatus } = useSession();
  const [broadcasts, setBroadcasts] = useState<BroadcastRow[]>([]);
  const [loading, setLoading] = useState(true);

  const studentId = session?.dbId;
  const studentYear = session?.user?.study_year ? Number(session.user.study_year) : null;

  useEffect(() => {
    // authenticated implies session; cancelled drops a superseded run (session object changes on every refetch).
    if (authStatus !== "authenticated") return;
    let cancelled = false;
    const now = new Date().toISOString();

    const loadBroadcasts = async () => {
      const [bRes, sgRes, uRes] = await Promise.all([
        supabase
          .from("broadcasts")
          .select("*")
          .or(`expires_at.is.null,expires_at.gt.${now}`)
          .order("pinned", { ascending: false })
          .order("created_at", { ascending: false }),
        supabase.from("student_grades").select("prefix, year_label").eq("domain", DEFAULT_DOMAIN),
        studentId ? supabase.from("users").select("*").eq("id", studentId).maybeSingle() : Promise.resolve({ data: null }),
      ]);

      if (cancelled) return;
      const gradesList = sgRes.data || [];
      const studentProfile = uRes?.data;

      const email = session?.user?.email || "";
      const match = email.match(/^(\d+)@/);
      const parsedStudentNo = match ? match[1] : "";
      const finalStudentNo = studentProfile?.student_no || parsedStudentNo;
      const prefix = finalStudentNo ? String(finalStudentNo).substring(0, 2) : "";
      const studentLabel = gradesList.find((g) => g.prefix === prefix)?.year_label ?? null;

      const filtered = (bRes.data || []).filter((b) => matchesYearLevel(b.year_level, studentYear, studentLabel));

      setBroadcasts(filtered);
      setLoading(false);
    };

    loadBroadcasts();
    return () => { cancelled = true; };
  }, [session, studentId, studentYear, authStatus]);

  return (
    <PageContainer>
      <PageHeader kicker="พื้นที่นักศึกษา" title="ประกาศจากระบบ" description="ข่าวสารและประกาศจากอาจารย์ผู้ดูแลระบบ" />

      {loading ? (
        <LoadingState />
      ) : broadcasts.length === 0 ? (
        <EmptyState icon={<BellIcon />} title="ยังไม่มีประกาศ" description="เมื่อมีประกาศจากระบบ จะแสดงที่นี่" />
      ) : (
        <div className="flex flex-col gap-3">
          {broadcasts.map((b) => <BroadcastCard key={b.id} broadcast={b} />)}
        </div>
      )}
    </PageContainer>
  );
}
