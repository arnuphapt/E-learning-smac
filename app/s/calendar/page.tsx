"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { PageContainer } from "@/components/common/page-container";
import { PageHeader } from "@/components/common/page-header";
import { LoadingState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { buildEvents, type CalendarAssignment, type CalendarLesson } from "@/components/student/calendar/events";
import { MonthGrid } from "@/components/student/calendar/month-grid";
import { UpcomingCard } from "@/components/student/calendar/upcoming-card";
import { STUDENT_LESSON_COLUMNS } from "@/lib/files";
import { isStaffRole } from "@/lib/roles";
import { supabase } from "@/lib/supabase";

const MONTHS = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
const monthLabel = (d: Date) => `${MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;

export default function Calendar() {
  const { data: session } = useSession();
  const role = session?.user?.role;

  const [today] = useState(() => new Date());
  const [viewed, setViewed] = useState(() => new Date());
  const [assignments, setAssignments] = useState<CalendarAssignment[]>([]);
  const [lessons, setLessons] = useState<CalendarLesson[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [aRes, lRes] = await Promise.all([
        supabase.from("assignments").select("*, course:courses(code)"),
        supabase.from("lessons").select(`${STUDENT_LESSON_COLUMNS}, course:courses(code)`),
      ]);
      if (aRes.data) setAssignments(aRes.data);
      if (lRes.data) setLessons(lRes.data);
      setLoading(false);
    }
    load();
  }, []);

  const events = useMemo(() => buildEvents(assignments, lessons, isStaffRole(role)), [assignments, lessons, role]);
  const todayStart = useMemo(() => new Date(today.getFullYear(), today.getMonth(), today.getDate()), [today]);
  const upcoming = useMemo(
    () => events.filter((e) => e.date >= todayStart).sort((a, b) => a.date.getTime() - b.date.getTime()),
    [events, todayStart],
  );

  const shiftMonth = (delta: number) => setViewed(new Date(viewed.getFullYear(), viewed.getMonth() + delta, 1));

  if (loading) return <PageContainer><LoadingState /></PageContainer>;

  return (
    <PageContainer>
      <PageHeader
        kicker={monthLabel(viewed)}
        title="ปฏิทินการส่งงาน"
        description="กำหนดส่งใบงานและแบบทดสอบของทุกรายวิชา รวมไว้ในที่เดียว"
        actions={
          <>
            <Button variant="outline" size="icon" aria-label="เดือนก่อนหน้า" onClick={() => shiftMonth(-1)}>
              <ChevronLeftIcon />
            </Button>
            <div className="min-w-32 text-center font-semibold">{monthLabel(viewed)}</div>
            <Button variant="outline" size="icon" aria-label="เดือนถัดไป" onClick={() => shiftMonth(1)}>
              <ChevronRightIcon />
            </Button>
          </>
        }
      />
      <div className="flex flex-col items-stretch gap-5 lg:flex-row lg:items-start">
        <MonthGrid viewed={viewed} today={today} events={events} />
        <UpcomingCard events={upcoming} today={todayStart} />
      </div>
    </PageContainer>
  );
}
