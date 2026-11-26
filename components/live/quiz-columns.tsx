"use client";

import Link from "next/link";
import { CopyIcon, PencilIcon, PlayIcon, Trash2Icon } from "lucide-react";
import { ColumnHeader, RowActions, selectionColumn, type DataTableColumnDef } from "@/components/common/data-table";
import { ToneBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import type { Database } from "@/lib/database.types";
import type { QuizValidationResult } from "@/lib/live";

type LiveQuizRow = Pick<Database["public"]["Tables"]["live_quizzes"]["Row"], "id" | "title" | "created_at" | "updated_at">;

export type LiveQuizQuestionRow = Pick<
  Database["public"]["Tables"]["live_quiz_questions"]["Row"],
  "id" | "no" | "text" | "choices" | "answer" | "time_limit_sec" | "points"
>;

export interface FormattedLiveQuiz extends LiveQuizRow {
  questions: LiveQuizQuestionRow[];
  validation: QuizValidationResult;
}

export function quizColumns(
  onEdit: (quiz: FormattedLiveQuiz) => void,
  onDuplicate: (quiz: FormattedLiveQuiz) => void,
  onDelete: (quiz: FormattedLiveQuiz) => void,
  busy: boolean,
): DataTableColumnDef[] {
  return [
    selectionColumn<FormattedLiveQuiz>((q) => q.title),
    {
      accessorKey: "title",
      header: ({ column }) => <ColumnHeader column={column} title="ชุดควิซ" />,
      cell: ({ row }) => {
        const quiz = row.original as FormattedLiveQuiz;
        const reason = quiz.validation?.problems?.[0]?.reason;
        return (
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-foreground">{quiz.title}</span>
            {quiz.validation?.ok ? (
              <ToneBadge tone="success">พร้อม</ToneBadge>
            ) : (
              <ToneBadge tone="warning" className="max-w-xs" >
                <span title={reason} className="truncate">
                  ยังไม่พร้อม{reason ? `: ${reason}` : ""}
                </span>
              </ToneBadge>
            )}
          </div>
        );
      },
    },
    {
      id: "questionCount",
      accessorFn: (quiz: FormattedLiveQuiz) => quiz.questions?.length || 0,
      header: ({ column }) => <ColumnHeader column={column} title="คำถาม" />,
      cell: ({ row }) => <span className="text-muted-foreground tabular-nums">{row.original.questions?.length || 0} คำถาม</span>,
    },
    {
      accessorKey: "updated_at",
      header: ({ column }) => <ColumnHeader column={column} title="แก้ไขเมื่อ" />,
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground tabular-nums">
          {new Date(row.original.updated_at).toLocaleDateString("th-TH", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row }) => {
        const quiz = row.original as FormattedLiveQuiz;
        return (
          <div className="flex items-center justify-end gap-2">
            {quiz.validation?.ok && (
              <Button asChild size="sm">
                <Link href={`/i/live?quiz=${quiz.id}`}>
                  <PlayIcon />
                  เปิดห้อง
                </Link>
              </Button>
            )}
            <Button type="button" variant="outline" size="sm" onClick={() => onEdit(quiz)} disabled={busy}>
              <PencilIcon />
              แก้ไข
            </Button>
            <RowActions
              actions={[
                { label: "คัดลอก", icon: <CopyIcon />, onSelect: () => onDuplicate(quiz), disabled: busy },
                { label: "ลบ", icon: <Trash2Icon />, destructive: true, onSelect: () => onDelete(quiz), disabled: busy },
              ]}
            />
          </div>
        );
      },
    },
  ];
}
