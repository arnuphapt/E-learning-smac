"use client";

import { useState } from "react";
import { Loader2Icon, PlusIcon } from "lucide-react";
import { FormField } from "@/components/common/form-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

/** Dialog for creating a new lesson by title; mount only while open. */
export function CreateLessonDialog({
  onClose,
  onCreate,
  loading,
}: {
  onClose: () => void;
  onCreate: (title: string) => Promise<void>;
  loading?: boolean;
}) {
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    const trimmed = title.trim();
    if (!trimmed) {
      setError("กรุณากรอกชื่อบทเรียน");
      return;
    }
    setError(null);
    await onCreate(trimmed);
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !loading && onClose()}>
      <DialogContent>
        <form noValidate className="grid gap-4" onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>สร้างบทเรียนใหม่</DialogTitle>
            <DialogDescription>ตั้งชื่อบทเรียน จากนั้นระบบจะพาไปยังหน้าจัดการวิดีโอ ข้อสอบ และใบงาน</DialogDescription>
          </DialogHeader>
          <FormField label="ชื่อบทเรียน" htmlFor="new-lesson-title" required error={error}>
            <Input
              id="new-lesson-title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (error) setError(null);
              }}
              placeholder="เช่น บทที่ 1 แนวคิดพื้นฐาน"
              autoFocus
              disabled={loading}
            />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              ยกเลิก
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2Icon className="animate-spin" /> : <PlusIcon />}
              สร้างบทเรียน
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
