"use client";

import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { ColumnHeader, type DataTableColumnDef } from "@/components/common/data-table";
import { ToneBadge } from "@/components/common/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Database } from "@/lib/database.types";

export type LiveSessionRow = Pick<
  Database["public"]["Tables"]["live_sessions"]["Row"],
  "id" | "course_id" | "title" | "pin" | "phase" | "total" | "restrict_to_course" | "team_mode" | "created_at" | "ended_at"
>;

export const ongoingRoomColumns: DataTableColumnDef[] = [
  {
    accessorKey: "title",
    header: ({ column }) => <ColumnHeader column={column} title="ห้อง" />,
    cell: ({ row }) => (
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold text-foreground">{row.original.title}</span>
        <ToneBadge tone="warning">{row.original.phase}</ToneBadge>
      </div>
    ),
  },
  {
    accessorKey: "pin",
    header: "PIN",
    enableSorting: false,
    cell: ({ row }) => <strong className="font-mono text-sm font-bold text-primary">{row.original.pin}</strong>,
  },
  {
    accessorKey: "total",
    header: ({ column }) => <ColumnHeader column={column} title="จำนวน" />,
    cell: ({ row }) => <span className="text-muted-foreground">{row.original.total} ข้อ</span>,
  },
  {
    id: "mode",
    header: "โหมด",
    enableSorting: false,
    cell: ({ row }) => (
      <div className="flex flex-col items-start gap-1">
        <Badge variant="outline">{row.original.team_mode ? "โหมดทีม" : "โหมดเดี่ยว"}</Badge>
        <span className="text-xs text-muted-foreground">
          {row.original.restrict_to_course ? "จำกัดเฉพาะรายวิชา" : "เปิดสาธารณะ"}
        </span>
      </div>
    ),
  },
  {
    id: "actions",
    header: "",
    enableSorting: false,
    cell: ({ row }) => (
      <div className="flex justify-end">
        <Button asChild size="sm">
          <Link href={`/i/live/${row.original.id}`}>
            เข้าห้องควบคุม (Host)
            <ArrowRightIcon />
          </Link>
        </Button>
      </div>
    ),
  },
];

export const endedRoomColumns: DataTableColumnDef[] = [
  {
    accessorKey: "title",
    header: ({ column }) => <ColumnHeader column={column} title="ห้อง" />,
    cell: ({ row }) => <span className="font-semibold text-foreground">{row.original.title}</span>,
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => <ColumnHeader column={column} title="วันที่เปิด" />,
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground tabular-nums">
        {new Date(row.original.created_at).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })} · {row.original.total} ข้อ
      </span>
    ),
  },
  {
    id: "actions",
    header: "",
    enableSorting: false,
    cell: ({ row }) => (
      <div className="flex justify-end">
        <Button asChild variant="outline" size="sm">
          <Link href={`/i/live/${row.original.id}/results`}>ดูผล</Link>
        </Button>
      </div>
    ),
  },
];
