"use client";

import { ColumnHeader, type DataTableColumnDef } from "@/components/common/data-table";
import { ToneBadge } from "@/components/common/status-badge";
import type { ResultPlayer, ResultQuestion, ResultTeam } from "./results-data";

function RankCell({ rank, podium }: { rank: number; podium: boolean }) {
  return podium ? (
    <ToneBadge tone={rank === 2 ? "outline" : "warning"} className="min-w-7 justify-center">
      {rank}
    </ToneBadge>
  ) : (
    <span className="font-mono text-xs text-muted-foreground">{rank}</span>
  );
}

export function playerColumns(isTeamMode: boolean, total: number): DataTableColumnDef[] {
  return [
    {
      accessorKey: "rank",
      header: ({ column }) => <ColumnHeader column={column} title="อันดับ" />,
      cell: ({ row }) => <RankCell rank={row.original.rank} podium={row.original.rank <= 3} />,
    },
    {
      accessorKey: "name",
      header: ({ column }) => <ColumnHeader column={column} title="ชื่อผู้เล่น" />,
      cell: ({ row }) => <span className="font-semibold text-foreground">{(row.original as ResultPlayer).name}</span>,
    },
    ...(isTeamMode
      ? [
          {
            accessorKey: "team",
            header: ({ column }) => <ColumnHeader column={column} title="ทีม" />,
            cell: ({ row }) => <span className="text-muted-foreground">{(row.original as ResultPlayer).team || "-"}</span>,
          } as DataTableColumnDef,
        ]
      : []),
    {
      accessorKey: "correct",
      header: ({ column }) => <ColumnHeader column={column} title="ตอบถูก" />,
      cell: ({ row }) => (
        <span className="text-muted-foreground tabular-nums">
          {row.original.correct} / {total} ข้อ
        </span>
      ),
    },
    {
      accessorKey: "score",
      header: ({ column }) => <ColumnHeader column={column} title="คะแนนรวม" />,
      cell: ({ row }) => <span className="font-bold text-foreground tabular-nums">{(row.original as ResultPlayer).score.toLocaleString()}</span>,
    },
  ];
}

export const teamColumns: DataTableColumnDef[] = [
  {
    accessorKey: "rank",
    header: ({ column }) => <ColumnHeader column={column} title="อันดับ" />,
    cell: ({ row }) => <RankCell rank={row.original.rank} podium={row.original.rank === 1} />,
  },
  {
    accessorKey: "name",
    header: ({ column }) => <ColumnHeader column={column} title="ชื่อทีม" />,
    cell: ({ row }) => <span className="font-semibold text-foreground">{(row.original as ResultTeam).name}</span>,
  },
  {
    accessorKey: "members",
    header: ({ column }) => <ColumnHeader column={column} title="จำนวนสมาชิก" />,
    cell: ({ row }) => <span className="text-muted-foreground tabular-nums">{row.original.members} คน</span>,
  },
  {
    accessorKey: "score",
    header: ({ column }) => <ColumnHeader column={column} title="คะแนนเฉลี่ย" />,
    cell: ({ row }) => <span className="font-bold text-foreground tabular-nums">{(row.original as ResultTeam).score.toLocaleString()}</span>,
  },
];

export const questionColumns: DataTableColumnDef[] = [
  {
    accessorKey: "idx",
    header: ({ column }) => <ColumnHeader column={column} title="ข้อที่" />,
    cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">{row.original.idx + 1}</span>,
  },
  {
    accessorKey: "text",
    header: ({ column }) => <ColumnHeader column={column} title="คำถาม" />,
    cell: ({ row }) => <span className="font-medium text-foreground">{(row.original as ResultQuestion).text}</span>,
  },
  {
    accessorKey: "correctPct",
    header: ({ column }) => <ColumnHeader column={column} title="ความถูกต้อง (%)" />,
    cell: ({ row }) => {
      const pct = (row.original as ResultQuestion).correctPct;
      return <ToneBadge tone={pct >= 70 ? "success" : pct >= 40 ? "warning" : "danger"}>{pct}%</ToneBadge>;
    },
  },
  {
    accessorKey: "answered",
    header: ({ column }) => <ColumnHeader column={column} title="ตอบแล้ว" />,
    cell: ({ row }) => <span className="text-muted-foreground tabular-nums">{row.original.answered} คน</span>,
  },
];
