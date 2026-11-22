"use client"

import { useState } from "react"
import { CheckIcon, PencilIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { MarkdownView } from "@/components/common/markdown-view"

/** Persona prompt viewer (rendered / source) with an inline edit mode. `onSave` resolves true when saved. */
export function PersonaEditor({ content, saving, onSave }: { content: string; saving: boolean; onSave: (draft: string) => Promise<boolean> }) {
  const [tab, setTab] = useState("rendered")
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState("")

  const save = async () => {
    if (await onSave(draft)) setIsEditing(false)
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="rendered">RENDERED</TabsTrigger>
            <TabsTrigger value="source">SOURCE</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="ml-auto flex gap-2">
          {!isEditing ? (
            <Button
              onClick={() => {
                setDraft(content)
                setIsEditing(true)
              }}
            >
              <PencilIcon />
              แก้ไขบทบาท AI
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)} disabled={saving}>
                ยกเลิก
              </Button>
              <Button onClick={save} disabled={saving}>
                {saving ? (
                  <>
                    <Spinner />
                    กำลังบันทึก...
                  </>
                ) : (
                  <>
                    <CheckIcon />
                    บันทึกบทบาท AI
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </div>

      <Card className="min-h-100">
        <CardContent>
          {isEditing ? (
            <div className="flex flex-col gap-3">
              <Label htmlFor="ai-persona-markdown" className="text-muted-foreground">
                แก้ไขข้อกำหนดพฤติกรรม AI ในรูปแบบ Markdown:
              </Label>
              <Textarea
                id="ai-persona-markdown"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={18}
                className="font-mono leading-relaxed"
                placeholder="เขียนแนวทางพฤติกรรมของ AI..."
              />
            </div>
          ) : tab === "rendered" ? (
            <MarkdownView text={content} />
          ) : (
            <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-lg bg-foreground p-5 font-mono text-[13.5px] leading-relaxed text-background">
              {content}
            </pre>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
