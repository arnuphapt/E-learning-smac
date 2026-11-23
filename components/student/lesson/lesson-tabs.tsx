"use client"

import { useState } from "react"
import { BookOpenIcon, FileTextIcon, FolderIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AssignmentList } from "./assignment-list"
import { DocList } from "./doc-list"
import type { AssignmentRow, LessonRow, SubmissionRow } from "./types"

function Overview({ lesson }: { lesson: LessonRow }) {
  return (
    <Card>
      <CardContent>
        <h2 className="mb-2 font-bold">รายละเอียดบทเรียน</h2>
        <p className="whitespace-pre-line text-muted-foreground text-pretty">{lesson.description || "ไม่มีคำอธิบายบทเรียน"}</p>
      </CardContent>
    </Card>
  )
}

/** Overview / documents / assignments of a lesson; a lesson with nothing but a description shows the overview without tabs. */
export function LessonTabs({ lesson, assignments, submissions, noVideo }: { lesson: LessonRow; assignments: AssignmentRow[]; submissions: SubmissionRow[]; noVideo: boolean }) {
  const [tab, setTab] = useState("overview")
  if (noVideo && !lesson.has_docs && !lesson.has_assignment) return <Overview lesson={lesson} />

  const tabs = [
    { key: "overview", label: "ภาพรวม", icon: BookOpenIcon },
    ...(lesson.has_docs ? [{ key: "docs", label: "เอกสารประกอบ", icon: FolderIcon }] : []),
    ...(lesson.has_assignment ? [{ key: "assign", label: "ใบงาน", icon: FileTextIcon }] : []),
  ]
  // a tab that vanished (lesson changed) falls back to the overview
  const active = tabs.some((t) => t.key === tab) ? tab : "overview"

  return (
    <Tabs value={active} onValueChange={setTab}>
      <TabsList>
        {tabs.map(({ key, label, icon: Icon }) => (
          <TabsTrigger key={key} value={key}>
            <Icon />
            {label}
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="overview" className="mt-3">
        <Overview lesson={lesson} />
      </TabsContent>
      <TabsContent value="docs" className="mt-3">
        <DocList lesson={lesson} />
      </TabsContent>
      <TabsContent value="assign" className="mt-3">
        <AssignmentList assignments={assignments} submissions={submissions} />
      </TabsContent>
    </Tabs>
  )
}
