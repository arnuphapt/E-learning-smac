"use client"

import { useMemo } from "react"
import { useRouter } from "next/navigation"
import { ClipboardListIcon, LayersIcon, MessageSquareOffIcon, PencilIcon, TagsIcon } from "lucide-react"
import { topicNames } from "@/lib/tutor-bank"
import { ColumnHeader, DataTable, RowActions, type DataTableColumnDef } from "@/components/common/data-table"
import { StatCards } from "@/components/common/stat-cards"
import { EmptyState } from "@/components/common/states"
import { ToneBadge } from "@/components/common/status-badge"
import type { BankData, BankQuestionRow } from "./bank-data"

const NO_TOPIC = "ไม่มีหัวข้อ"
const HAS_EXPLAIN = "มีคำอธิบาย"
const NO_EXPLAIN = "ยังไม่มีคำอธิบาย"

type OverviewRow = BankQuestionRow & { setLabel: string; lessonLabel: string; topicLabel: string; explainLabel: string }

/** Every tutor bank question the caller manages as a read-only DataTable; each row opens the question in its lesson's bank page (#q-<id>). */
export function BankOverview({ data }: { data: BankData }) {
  const router = useRouter()
  const { sets, lessons, rows: bank, setById, lessonById } = data

  const rows = useMemo<OverviewRow[]>(
    () =>
      bank.map((r) => {
        const set = setById.get(r.setId)
        const lesson = lessonById.get(r.lessonId)
        return {
          ...r,
          setLabel: set ? `${set.code} ${set.title}` : "-",
          lessonLabel: `${set?.code ?? ""} · บทที่ ${lesson?.index ?? "-"} ${lesson?.title ?? ""}`.trim(),
          topicLabel: r.topic || NO_TOPIC,
          explainLabel: r.hasExplanation ? HAS_EXPLAIN : NO_EXPLAIN,
        }
      }),
    [bank, setById, lessonById],
  )

  const columns = useMemo<DataTableColumnDef[]>(
    () => [
      {
        accessorKey: "setLabel",
        header: ({ column }) => <ColumnHeader column={column} title="ชุดติว" />,
        cell: ({ row }) => <ToneBadge tone="muted">{setById.get(row.original.setId)?.code ?? "-"}</ToneBadge>,
      },
      {
        accessorKey: "lessonLabel",
        header: ({ column }) => <ColumnHeader column={column} title="บทเรียน" />,
        cell: ({ row }) => {
          const lesson = lessonById.get(row.original.lessonId)
          return <span className="text-sm text-muted-foreground">บทที่ {lesson?.index} {lesson?.title}</span>
        },
      },
      {
        accessorKey: "text",
        header: "ข้อสอบ",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="min-w-64 max-w-xl">
            <div className="line-clamp-2 text-sm font-semibold [overflow-wrap:anywhere]">{row.original.text}</div>
            {row.original.answerText && <div className="mt-1 truncate text-xs text-success">เฉลย: {row.original.answerText}</div>}
          </div>
        ),
      },
      {
        accessorKey: "topicLabel",
        header: ({ column }) => <ColumnHeader column={column} title="หัวข้อ" />,
        cell: ({ row }) => <ToneBadge tone={row.original.topic ? "primary" : "muted"}>{row.original.topicLabel}</ToneBadge>,
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) => {
          const r = row.original as OverviewRow
          return (
            <div className="flex justify-end">
              <RowActions
                label="เมนูจัดการข้อสอบ"
                actions={[{ label: "แก้ไขในคลังข้อสอบของบท", icon: <PencilIcon />, onSelect: () => router.push(`/i/lesson/${r.lessonId}/bank#q-${r.id}`) }]}
              />
            </div>
          )
        },
      },
    ],
    [router, setById, lessonById],
  )

  const topicOptions = topicNames(bank).map((t) => ({ value: t, label: t }))
  const withoutTopic = bank.some((r) => !r.topic)

  return (
    <>
      <StatCards
        stats={[
          { label: "ข้อสอบทั้งหมด", value: bank.length, icon: <ClipboardListIcon /> },
          { label: "ชุดติว", value: sets.length, icon: <LayersIcon /> },
          { label: "บทเรียน", value: lessons.length, icon: <TagsIcon /> },
          { label: "ยังไม่มีคำอธิบาย", value: bank.filter((r) => !r.hasExplanation).length, icon: <MessageSquareOffIcon />, tone: "warning" },
        ]}
      />
      <DataTable.Root data={rows} columns={columns} getRowId={(r: OverviewRow) => r.id} searchKeys={["text", "answerText", "topicLabel", "lessonLabel"]}>
        <DataTable.Toolbar>
          <DataTable.Search placeholder="ค้นหาในโจทย์…" />
          <DataTable.Filter column="setLabel" options={sets.map((c) => ({ value: `${c.code} ${c.title}`, label: `${c.code} ${c.title}` }))} allLabel="ชุดติว: ทั้งหมด" />
          <DataTable.Filter
            column="lessonLabel"
            options={lessons.map((l) => {
              const label = `${setById.get(l.course_id)?.code ?? ""} · บทที่ ${l.index ?? "-"} ${l.title}`.trim()
              return { value: label, label }
            })}
            allLabel="บทเรียน: ทั้งหมด"
          />
          <DataTable.Filter column="topicLabel" options={[...topicOptions, ...(withoutTopic ? [{ value: NO_TOPIC, label: NO_TOPIC }] : [])]} allLabel="หัวข้อ: ทั้งหมด" />
          <DataTable.Filter
            column="explainLabel"
            options={[
              { value: HAS_EXPLAIN, label: HAS_EXPLAIN },
              { value: NO_EXPLAIN, label: NO_EXPLAIN },
            ]}
            allLabel="คำอธิบาย: ทั้งหมด"
          />
        </DataTable.Toolbar>
        <DataTable.Content
          empty={
            bank.length === 0 ? (
              <EmptyState icon={<ClipboardListIcon />} title="ยังไม่มีข้อสอบในคลัง" description="เพิ่มข้อสอบได้ที่หน้าคลังข้อสอบของแต่ละบทในชุดติว" />
            ) : (
              <EmptyState title="ไม่พบข้อสอบตามตัวกรอง" description="ลองล้างตัวกรองหรือเปลี่ยนคำค้นหา" />
            )
          }
        />
        <DataTable.Pagination />
      </DataTable.Root>
    </>
  )
}
