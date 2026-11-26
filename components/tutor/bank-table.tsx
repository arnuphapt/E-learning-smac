"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { CircleCheckIcon, ClipboardListIcon, FolderInputIcon, MessageSquareOffIcon, PencilIcon, PlusIcon, TagsIcon, Trash2Icon, TriangleAlertIcon } from "lucide-react"
import { StatCards } from "@/components/common/stat-cards"
import type { Database } from "@/lib/database.types"
import { bankWarning } from "@/lib/tutor-bank"
import {
  ColumnHeader,
  DataTable,
  RowActions,
  selectionColumn,
  useDataTable,
  type DataTableColumnDef,
} from "@/components/common/data-table"
import { EmptyState } from "@/components/common/states"
import { ToneBadge } from "@/components/common/status-badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BankQuestionCell } from "./bank-question-card"

type QuestionRow = Database["public"]["Tables"]["questions"]["Row"]
type TutorTopicRow = Database["public"]["Tables"]["tutor_topics"]["Row"]

type BankRow = QuestionRow & { seq: number; topicLabel: string; explainLabel: string }

const NO_TOPIC = "ไม่มีหัวข้อ"
const NO_EXPLAIN = "ยังไม่มีคำอธิบาย"
const HAS_EXPLAIN = "มีคำอธิบาย"
const MOVE_NONE = "__none__"

/** Deep link from /i/tutor/bank (#q-<id>): open the page that holds the row, then scroll to it. */
function BankDeepLink() {
  const table = useDataTable()
  useEffect(() => {
    const hash = window.location.hash.slice(1)
    if (!hash.startsWith("q-")) return
    const idx = table.getFilteredRowModel().rows.findIndex((r: { original: QuestionRow }) => "q-" + r.original.id === hash)
    if (idx < 0) return
    table.setPageIndex(Math.floor(idx / table.state.pagination.pageSize))
    requestAnimationFrame(() => document.getElementById(hash)?.scrollIntoView({ block: "center" }))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, on mount (the table is only mounted after the bank has loaded)
  }, [])
  return null
}

/** The bank as a DataTable: search + topic / explanation filters, edit and delete per row, bulk delete and bulk move to a topic. */
export function BankTable({
  questions,
  topics,
  drawCount,
  onAdd,
  onEdit,
  onDelete,
  onMoveTopic,
}: {
  questions: QuestionRow[]
  topics: TutorTopicRow[]
  /** Saved lessons.tutor_draw_count (null = whole bank). */
  drawCount: number | null
  onAdd: () => void
  onEdit: (q: QuestionRow) => void
  /** Same delete as the row's ลบ, for one or many; asks to confirm itself. Resolves true when done. */
  onDelete: (qs: QuestionRow[]) => Promise<boolean>
  /** `topicId` null = clear the topic. */
  onMoveTopic: (qs: QuestionRow[], topicId: string | null) => Promise<boolean>
}) {
  const [moveTo, setMoveTo] = useState(MOVE_NONE)
  // Columns are memoised once; they call the latest handlers through this ref (read only inside click handlers).
  const handlers = useRef({ onEdit, onDelete })
  useEffect(() => {
    handlers.current = { onEdit, onDelete }
  })

  const rows = useMemo<BankRow[]>(
    () =>
      questions.map((q, i) => ({
        ...q,
        seq: i + 1,
        topicLabel: topics.find((t) => t.id === q.topic_id)?.name || NO_TOPIC,
        explainLabel: q.explanation ? HAS_EXPLAIN : NO_EXPLAIN,
      })),
    [questions, topics],
  )

  const columns = useMemo<DataTableColumnDef[]>(
    () => [
      selectionColumn<BankRow>((r) => `ข้อ ${r.seq}`),
      {
        accessorKey: "seq",
        header: ({ column }) => <ColumnHeader column={column} title="ข้อ" />,
        cell: ({ row }) => <span className="font-bold tabular-nums text-muted-foreground">{String(row.original.seq).padStart(2, "0")}</span>,
      },
      {
        accessorKey: "text",
        header: "ข้อสอบ",
        enableSorting: false,
        cell: ({ row }) => <BankQuestionCell q={row.original} />,
      },
      {
        accessorKey: "topicLabel",
        header: ({ column }) => <ColumnHeader column={column} title="หัวข้อ" />,
        cell: ({ row }) =>
          row.original.topicLabel === NO_TOPIC ? <ToneBadge tone="muted">{NO_TOPIC}</ToneBadge> : <ToneBadge tone="primary">{row.original.topicLabel}</ToneBadge>,
      },
      {
        accessorKey: "explainLabel",
        header: "คำอธิบาย",
        enableSorting: false,
        cell: ({ row }) =>
          row.original.explainLabel === HAS_EXPLAIN ? <ToneBadge tone="success">{HAS_EXPLAIN}</ToneBadge> : <ToneBadge tone="warning">{NO_EXPLAIN}</ToneBadge>,
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) => {
          const q = row.original as BankRow
          return (
            <div className="flex justify-end">
              <RowActions
                label={`เมนูจัดการข้อ ${q.seq}`}
                actions={[
                  { label: "แก้ไข", icon: <PencilIcon />, onSelect: () => handlers.current.onEdit(q) },
                  { label: "ลบ", icon: <Trash2Icon />, destructive: true, onSelect: () => void handlers.current.onDelete([q]) },
                ]}
              />
            </div>
          )
        },
      },
    ],
    [],
  )

  const topicOptions = topics.map((t) => ({ value: t.name, label: t.name }))
  const withoutTopic = rows.some((r) => r.topicLabel === NO_TOPIC)
  const warning = bankWarning(questions.length, drawCount)
  const missingExplain = rows.filter((r) => r.explainLabel === NO_EXPLAIN).length

  return (
    <>
    <StatCards
      stats={[
        { label: "ข้อสอบในคลัง", value: questions.length, icon: <ClipboardListIcon /> },
        { label: "หัวข้อ", value: topics.length, icon: <TagsIcon /> },
        { label: "ข้อต่อรอบ", value: drawCount ?? "ทั้งคลัง", icon: warning ? <TriangleAlertIcon /> : <CircleCheckIcon />, tone: warning ? "warning" : "success" },
        { label: "ยังไม่มีคำอธิบาย", value: missingExplain, icon: <MessageSquareOffIcon />, tone: missingExplain > 0 ? "warning" : undefined },
      ]}
    />
    <DataTable.Root data={rows} columns={columns} getRowId={(r: BankRow) => r.id} searchKeys={["text", "topicLabel", "explanation"]}>
      <BankDeepLink />
      <DataTable.Toolbar>
        <DataTable.Search placeholder="ค้นหาข้อสอบหรือหัวข้อ…" />
        <DataTable.Filter
          column="topicLabel"
          options={[...topicOptions, ...(withoutTopic ? [{ value: NO_TOPIC, label: NO_TOPIC }] : [])]}
          allLabel="หัวข้อ: ทั้งหมด"
        />
        <DataTable.Filter
          column="explainLabel"
          options={[
            { value: HAS_EXPLAIN, label: HAS_EXPLAIN },
            { value: NO_EXPLAIN, label: NO_EXPLAIN },
          ]}
          allLabel="คำอธิบาย: ทั้งหมด"
        />
      </DataTable.Toolbar>
      <DataTable.BulkBar<BankRow>>
        {({ rows: picked, clear }) => (
          <>
            <Select value={moveTo} onValueChange={setMoveTo}>
              <SelectTrigger aria-label="เลือกหัวข้อปลายทาง" className="h-9 w-48 bg-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={MOVE_NONE}>ย้ายไปหัวข้อ…</SelectItem>
                {topics.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={moveTo === MOVE_NONE}
              onClick={async () => {
                if (await onMoveTopic(picked, moveTo)) {
                  setMoveTo(MOVE_NONE)
                  clear()
                }
              }}
            >
              <FolderInputIcon />
              ย้ายหัวข้อ
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={async () => {
                if (await onDelete(picked)) clear()
              }}
            >
              <Trash2Icon />
              ลบที่เลือก
            </Button>
          </>
        )}
      </DataTable.BulkBar>
      <DataTable.Content
        empty={
          questions.length === 0 ? (
            <EmptyState
              icon={<ClipboardListIcon />}
              title="ยังไม่มีข้อสอบในคลัง"
              action={
                <Button onClick={onAdd}>
                  <PlusIcon />
                  เพิ่มข้อแรก
                </Button>
              }
            />
          ) : (
            <EmptyState title="ไม่พบข้อสอบตามเงื่อนไขที่เลือก" description="ลองเปลี่ยนตัวกรอง หรือค้นหาคำอื่น" />
          )
        }
      />
      <DataTable.Pagination />
    </DataTable.Root>
    </>
  )
}
