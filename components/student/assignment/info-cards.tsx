import type { ReactNode } from "react"
import { FileIcon, ListChecksIcon, PaperclipIcon, TargetIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getCriteriaList, type AssignmentAttachment, type RubricRow } from "./files"

function SectionTitle({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <CardTitle className="flex items-center gap-2 [&_svg]:size-4 [&_svg]:text-primary">
      {icon}
      {children}
    </CardTitle>
  )
}

export function InstructionsCard({ instructions }: { instructions: string | null }) {
  return (
    <Card>
      <CardHeader>
        <SectionTitle icon={<ListChecksIcon />}>คำชี้แจง</SectionTitle>
      </CardHeader>
      <CardContent>
        <p className="leading-relaxed">{instructions}</p>
      </CardContent>
    </Card>
  )
}

export function AttachmentsCard({ attachments }: { attachments: AssignmentAttachment[] }) {
  return (
    <Card>
      <CardHeader>
        <SectionTitle icon={<PaperclipIcon />}>ไฟล์แนบจากอาจารย์</SectionTitle>
      </CardHeader>
      <CardContent className="grid gap-1">
        {attachments.map((f, i) => (
          <div key={i} className="flex items-center gap-3 px-1 py-2">
            <div className="flex size-9 items-center justify-center rounded-lg bg-info-soft text-info">
              <FileIcon className="size-[17px]" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold">{f.name}</div>
              <div className="text-xs text-muted-foreground">{f.size}</div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

export function RubricPreviewCard({ rubric, points }: { rubric: RubricRow; points: number | null }) {
  return (
    <Card>
      <CardHeader>
        <SectionTitle icon={<TargetIcon />}>เกณฑ์การให้คะแนน (Rubric)</SectionTitle>
        <CardDescription>
          {rubric.title} · เต็ม {points} คะแนน
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-1">
        {getCriteriaList(rubric).map((c) => (
          <div key={c.id} className="flex items-center gap-3 px-1 py-2">
            <div className="flex-1">
              <div className="text-sm font-semibold">{c.name}</div>
              <div className="text-xs text-muted-foreground">{c.desc}</div>
            </div>
            <Badge variant="secondary">{c.max} คะแนน</Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
