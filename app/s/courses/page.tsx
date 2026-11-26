"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { BookOpenIcon, FilterIcon, LayoutGridIcon, ListIcon } from "lucide-react";
import { PageContainer } from "@/components/common/page-container";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState, LoadingState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CourseCard } from "@/components/student/course/course-card";
import { useStudentCourses } from "@/components/student/course/use-student-courses";
import { StudentHomeSummary } from "@/components/student/home/summary-band";

const VIEW_KEY = "nl_course_view";
const ALL = "all";

export default function StudentCourses() {
  const { data: session } = useSession();
  const { courses, years, loading } = useStudentCourses();
  const [year, setYear] = useState(ALL);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [viewRestored, setViewRestored] = useState(false);
  if (!viewRestored && typeof window !== "undefined") {
    setViewRestored(true);
    if (localStorage.getItem(VIEW_KEY) === "list") setView("list");
  }

  const changeView = (v: string) => {
    if (v !== "grid" && v !== "list") return; // ToggleGroup sends "" when the active item is clicked again
    setView(v);
    try { localStorage.setItem(VIEW_KEY, v); } catch {}
  };
  const list = courses.filter((c) => year === ALL || c.year === year);

  if (loading) return <PageContainer><LoadingState /></PageContainer>;

  return (
    <PageContainer>
      <PageHeader
        kicker="กลุ่มวิชาการพยาบาลผู้ใหญ่และผู้สูงอายุ"
        title="รายวิชาของฉัน"
        description="เลือกรายวิชาเพื่อเข้าเรียนบทเรียน ทำแบบทดสอบ และส่งใบงาน"
      />

      <StudentHomeSummary userName={session?.user?.name} courses={courses} />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Label htmlFor="course-year" className="text-muted-foreground">
            <FilterIcon className="size-4" />
            ปีการศึกษา
          </Label>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger id="course-year" className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>ทุกปีการศึกษา</SelectItem>
              {years.map((y) => (
                <SelectItem key={y.id} value={y.year ?? y.id}>
                  {y.label}
                  {y.status === "active" ? " (ปัจจุบัน)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="ml-2 text-sm text-muted-foreground">{list.length} รายวิชา</span>
        </div>
        <ToggleGroup type="single" variant="outline" value={view} onValueChange={changeView} aria-label="รูปแบบการแสดงผล">
          <ToggleGroupItem value="grid" aria-label="ตาราง">
            <LayoutGridIcon />
            ตาราง
          </ToggleGroupItem>
          <ToggleGroupItem value="list" aria-label="รายการ">
            <ListIcon />
            รายการ
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={<BookOpenIcon />}
          title="ไม่มีรายวิชาในปีการศึกษานี้"
          description="ลองเลือกปีการศึกษาอื่น หรือดูทุกปีการศึกษา"
          action={
            <Button variant="outline" size="sm" onClick={() => setYear(ALL)}>
              ดูทุกปีการศึกษา
            </Button>
          }
        />
      ) : view === "grid" ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map((c) => <CourseCard key={c.id} course={c} />)}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {list.map((c) => <CourseCard key={c.id} course={c} layout="list" />)}
        </div>
      )}
    </PageContainer>
  );
}
