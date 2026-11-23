import { AlertTriangleIcon, CheckCheckIcon, CheckIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

/** "Send your answers?" confirmation with how many questions are still blank. */
export function SubmitDialog({ open, onOpenChange, answered, total, onSubmit }: { open: boolean; onOpenChange: (open: boolean) => void; answered: number; total: number; onSubmit: () => void }) {
  const complete = answered >= total
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>ยืนยันการส่งคำตอบ?</DialogTitle>
          <DialogDescription>
            คุณตอบแล้ว {answered} จาก {total} ข้อ{!complete && ` · ยังเหลืออีก ${total - answered} ข้อที่ยังไม่ได้ตอบ`}
          </DialogDescription>
        </DialogHeader>
        <div className={cn("flex items-start gap-3 rounded-lg p-3.5 text-sm", complete ? "bg-success-soft text-success" : "bg-warning-soft text-warning")}>
          {complete ? <CheckCheckIcon className="size-[18px] shrink-0" /> : <AlertTriangleIcon className="size-[18px] shrink-0" />}
          {complete ? "คุณตอบครบทุกข้อแล้ว เมื่อส่งแล้วจะไม่สามารถแก้ไขได้" : "เมื่อส่งแล้วจะไม่สามารถแก้ไขคำตอบได้ ข้อที่ไม่ได้ตอบจะถือว่าผิด"}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            กลับไปทำต่อ
          </Button>
          <Button onClick={onSubmit}>
            <CheckIcon />
            ยืนยันส่งคำตอบ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
