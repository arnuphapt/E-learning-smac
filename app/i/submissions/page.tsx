"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/states";
import { ColumnHeader, DataTable, type DataTableColumnDef } from "@/components/common/data-table";

type AssignmentListRow = {
  id: string;
  title: string;
  courseCode: string;
  due: string;
  points: number | null;
  submitted: number;
  pending: number;
};

const columns: DataTableColumnDef[] = [
  {
    accessorKey: "title",
    header: ({ column }) => <ColumnHeader column={column} title="ใบงาน" />,
    cell: ({ row }) => (
      <Link href={`/i/submissions/${row.original.id}`} className="font-medium hover:underline">
        {row.original.title}
      </Link>
    ),
  },
  { accessorKey: "courseCode", header: ({ column }) => <ColumnHeader column={column} title="รายวิชา" /> },
  { accessorKey: "due", header: ({ column }) => <ColumnHeader column={column} title="กำหนดส่ง" /> },
  { accessorKey: "points", header: ({ column }) => <ColumnHeader column={column} title="คะแนนเต็ม" /> },
  { accessorKey: "submitted", header: ({ column }) => <ColumnHeader column={column} title="ส่งแล้ว" /> },
  { accessorKey: "pending", header: ({ column }) => <ColumnHeader column={column} title="รอตรวจ" /> },
  {
    id: "actions",
    header: "",
    enableSorting: false,
    cell: ({ row }) => (
      <Button asChild size="sm" variant="outline">
        <Link href={`/i/submissions/${row.original.id}`}>ตรวจใบงาน</Link>
      </Button>
    ),
  },
];

export default function SubmissionsIndexPage() {
  const [rows, setRows] = useState<AssignmentListRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      // Same sources as /i/submissions/[id]: courses_all (not `courses`, which hides tutor sets) + assignments.
      const [asgRes, courseRes, subRes] = await Promise.all([
        supabase.from("assignments").select("*"),
        supabase.from("courses_all").select("id, code"),
        supabase.from("submissions").select("assignment_id, status"),
      ]);
      const courseCode = new Map((courseRes.data ?? []).map((c) => [c.id, c.code]));
      const counts = new Map<string, { submitted: number; pending: number }>();
      for (const s of subRes.data ?? []) {
        if (!s.assignment_id || s.status === "not-submitted") continue;
        const c = counts.get(s.assignment_id) ?? { submitted: 0, pending: 0 };
        c.submitted += 1;
        if (s.status === "submitted") c.pending += 1;
        counts.set(s.assignment_id, c);
      }
      setRows(
        (asgRes.data ?? []).map((a) => ({
          id: a.id,
          title: a.title,
          courseCode: (a.course_id && courseCode.get(a.course_id)) || "-",
          due: a.due_short || a.due || "-",
          points: a.points,
          submitted: counts.get(a.id)?.submitted ?? 0,
          pending: counts.get(a.id)?.pending ?? 0,
        })),
      );
      setLoading(false);
    }
    load();
  }, []);

  const courseOptions = useMemo(
    () => [...new Set(rows.map((r) => r.courseCode))].sort().map((c) => ({ value: c, label: c })),
    [rows],
  );

  return (
    <div className="container">
      <PageHeader title="ตรวจใบงาน" description="เลือกใบงานเพื่อดูงานที่นักศึกษาส่งและให้คะแนน" />
      <DataTable.Root data={rows} columns={columns} getRowId={(r: AssignmentListRow) => r.id} searchKeys={["title", "courseCode"]}>
        <DataTable.Toolbar>
          <DataTable.Search placeholder="ค้นหาใบงานหรือรายวิชา…" />
          <DataTable.Filter column="courseCode" options={courseOptions} allLabel="ทุกรายวิชา" />
        </DataTable.Toolbar>
        <DataTable.Content loading={loading} empty={<EmptyState title="ยังไม่มีใบงาน" description="สร้างใบงานในบทเรียนของรายวิชา แล้วจะแสดงที่นี่" />} />
        <DataTable.Pagination />
      </DataTable.Root>
    </div>
  );
}
