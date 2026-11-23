"use client"

import { useState } from "react"
import { CheckIcon, PencilIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

const readNote = (key: string) => {
  try {
    return localStorage.getItem(key) ?? ""
  } catch {
    return ""
  }
}

/** Personal notes, kept in this browser's localStorage per student and lesson. Mount with `key={storageKey}`. */
export function LessonNotes({ storageKey }: { storageKey: string }) {
  const [note, setNote] = useState(() => readNote(storageKey))
  const [saved, setSaved] = useState(false)

  const save = () => {
    try {
      localStorage.setItem(storageKey, note)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {}
  }

  return (
    <Card>
      <CardHeader>
        <Label htmlFor="lesson-notes" className="text-base font-semibold">
          <PencilIcon className="size-4 text-primary" />
          สมุดบันทึกของฉัน
        </Label>
      </CardHeader>
      <CardContent>
        <Textarea id="lesson-notes" rows={5} placeholder="จดบันทึกระหว่างเรียน…" value={note} onChange={(e) => setNote(e.target.value)} />
        <div className="mt-3 flex justify-end">
          <Button type="button" variant="secondary" size="sm" onClick={save}>
            <CheckIcon />
            {saved ? "บันทึกสำเร็จ" : "บันทึกโน้ต"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
